/**
 * Accuracy check: how far apart are photos of the same person, and how close do
 * different people get? Runs Halo's real face engine in Chromium.
 *
 *   npm run accuracy                       the bundled AI-generated faces (default)
 *   EVAL_DIR=/path/to/faces npm run accuracy  any folder of <person>/<photo>.jpg (for example a
 *                                           subset of a public research dataset you are allowed to use)
 *
 * With the bundled faces there is one photo per person, so "same person" pairs
 * come from altered copies (light, blur, crop, tilt, compression, noise). That
 * measures robustness to capture conditions, not to real changes in pose,
 * expression, age or lighting. See docs/accuracy.md.
 */
import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = process.env.EVAL_DIR;
const BUNDLED = 'public/demo/faces';

function dataUrl(file: string) {
  const type = extname(file).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${type};base64,${readFileSync(file).toString('base64')}`;
}

function loadSet(): Record<string, string[]> {
  if (ROOT) {
    const set: Record<string, string[]> = {};
    for (const person of readdirSync(ROOT)) {
      const dir = join(ROOT, person);
      if (!statSync(dir).isDirectory()) continue;
      const photos = readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).slice(0, 6);
      if (photos.length >= 2) set[person] = photos.map((f) => dataUrl(join(dir, f)));
    }
    return set;
  }
  const set: Record<string, string[]> = {};
  for (const f of readdirSync(BUNDLED).filter((x) => x.endsWith('.jpg'))) set[f.replace('.jpg', '')] = [dataUrl(join(BUNDLED, f))];
  return set;
}

test('same person vs different people distances', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __fwDebug: boolean }).__fwDebug = true;
    localStorage.setItem('fw.settings', JSON.stringify({ welcomeSeen: true }));
  });
  await page.goto('/app/');
  await page.waitForFunction(() => !!(window as unknown as { __fwEval?: unknown }).__fwEval, undefined, { timeout: 60_000 });
  const set = loadSet();
  const augment = !ROOT;

  const result = await page.evaluate(
    async ({ set, augment }) => {
      const engine = (window as unknown as { __fwEval: typeof import('../../src/lib/faceEngine') }).__fwEval;
      await engine.loadEngine();
      const load = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = src;
        });
      // Each photo is placed in a camera-like frame (the face about two thirds of the width,
      // on a plain backdrop), then altered to stand in for a different capture of the same face.
      const place = (c: CanvasRenderingContext2D, im: HTMLImageElement, n: number, scale = 0.66, dx = 0, dy = 0) => {
        c.fillStyle = '#6b6f73';
        c.fillRect(0, 0, n, n);
        const w = n * scale;
        c.drawImage(im, (n - w) / 2 + dx * n, (n - w) / 2 + dy * n, w, w);
      };
      const variants: Array<[string, (ctx: CanvasRenderingContext2D, im: HTMLImageElement, n: number) => void]> = [
        ['as is', (c, im, n) => place(c, im, n)],
        ['closer', (c, im, n) => place(c, im, n, 0.8)],
        ['tilted 6°', (c, im, n) => { c.translate(n / 2, n / 2); c.rotate(0.1); c.translate(-n / 2, -n / 2); place(c, im, n); }],
        ['dim light', (c, im, n) => { c.filter = 'brightness(0.55)'; place(c, im, n); }],
        ['bright light', (c, im, n) => { c.filter = 'brightness(1.3) contrast(0.9)'; place(c, im, n); }],
        ['soft focus', (c, im, n) => { c.filter = 'blur(1.5px)'; place(c, im, n); }],
        ['tilted -8°', (c, im, n) => { c.translate(n / 2, n / 2); c.rotate(-0.14); c.translate(-n / 2, -n / 2); place(c, im, n); }],
        ['warm cast', (c, im, n) => { c.filter = 'sepia(0.5) saturate(1.3)'; place(c, im, n); }],
        ['smaller, off-centre', (c, im, n) => place(c, im, n, 0.42, 0.12, -0.05)],
        ['mirrored', (c, im, n) => { c.translate(n, 0); c.scale(-1, 1); place(c, im, n); }],
      ];
      const ENROL = 3; // the first three variants are the "enrolment photos"
      const out: Record<string, Array<{ kind: string; descriptor: number[] | null }>> = {};
      for (const [person, srcs] of Object.entries(set)) {
        out[person] = [];
        for (const src of srcs) {
          const im = await load(src);
          const list = augment ? variants : [variants[0]];
          for (const [kind, draw] of list) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d')!;
            draw(ctx, im, 512);
            const r = await engine.describe(canvas);
            out[person].push({ kind, descriptor: r.ok ? r.descriptor : null });
          }
        }
      }
      const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
      const genuine: Array<{ person: string; kind: string; d: number; runnerUp: number }> = [];
      const impostor: number[] = [];
      const missed: string[] = [];
      for (const [person, list] of Object.entries(out)) for (const x of list.slice(0, ENROL)) if (!x.descriptor) missed.push(`${person}: ${x.kind} (enrolment)`);
      const people = Object.keys(out);
      for (const person of people) {
        const gallery = out[person].slice(0, ENROL).flatMap((x) => (x.descriptor ? [x.descriptor] : []));
        if (gallery.length === 0) {
          missed.push(`${person}: no enrolment photo read`);
          continue;
        }
        const probes = out[person].slice(augment ? ENROL : 1);
        for (const p of probes) {
          if (!p.descriptor) {
            missed.push(`${person}: ${p.kind}`);
            continue;
          }
          const own = Math.min(...gallery.map((g) => dist(g, p.descriptor!)));
          let runnerUp = Infinity;
          for (const other of people) {
            if (other === person) continue;
            const og = out[other].slice(0, ENROL).flatMap((x) => (x.descriptor ? [x.descriptor] : []));
            if (og.length === 0) continue;
            const d = Math.min(...og.map((g) => dist(g, p.descriptor!)));
            impostor.push(d);
            runnerUp = Math.min(runnerUp, d);
          }
          genuine.push({ person, kind: p.kind, d: own, runnerUp });
        }
      }
      return { people: people.length, genuine, impostor, missed };
    },
    { set, augment },
  );

  const rate = (xs: number[], f: (x: number) => boolean) => (xs.length ? xs.filter(f).length / xs.length : 0);
  const g = result.genuine.map((x) => x.d);
  const confidentHits = result.genuine.filter((x) => x.d < 0.42 && x.runnerUp - x.d >= 0.08).length;
  const summary = {
    source: ROOT ? `EVAL_DIR (${result.people} people)` : `bundled AI-generated faces (${result.people} people, altered copies)`,
    samePersonPairs: g.length,
    differentPersonPairs: result.impostor.length,
    noFaceFound: result.missed,
    samePerson: { min: Math.min(...g), median: g.sort((a, b) => a - b)[Math.floor(g.length / 2)], max: Math.max(...g) },
    differentPeople: { min: Math.min(...result.impostor), median: [...result.impostor].sort((a, b) => a - b)[Math.floor(result.impostor.length / 2)] },
    atCareful: { confidentFrames: confidentHits / Math.max(g.length, 1), wrongPersonUnder042: rate(result.impostor, (d) => d < 0.42), wrongPersonUnder050: rate(result.impostor, (d) => d < 0.5) },
    hardest: result.genuine.sort((a, b) => b.d - a.d).slice(0, 4),
  };
  console.log(JSON.stringify(summary, null, 2));
  writeFileSync(ROOT ? 'eval/accuracy-custom.json' : 'eval/accuracy-synthetic.json', JSON.stringify(summary, null, 2) + '\n');
  expect(summary.differentPeople.min).toBeGreaterThan(0.42);
});
