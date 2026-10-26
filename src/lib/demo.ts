/**
 * Demo mode: sample people with AI-generated faces of people who do not exist
 * (public-domain StyleGAN images, see public/demo/faces/CREDITS.md), and a
 * "demo camera" that animates those faces, plus one face that is never added,
 * so anyone can see recognition and the "strangers stay unknown" rule alone.
 *
 * The sample fingerprints are computed on this device, exactly like a real
 * enrolment. Names, notes and relationships are invented.
 */
import { cropThumb, describe, loadEngine } from './faceEngine';
import { addOrUpdatePerson, refreshPeople, removePerson } from './people';
import type { Cues, Person } from './types';
import { listPeople } from './vault';
import { makeWhisper } from './whisper';

export const SAMPLE_AVAILABLE = true;

interface Sample {
  id: string;
  file: string;
  name: string;
  note: string;
  cues: Cues;
}

export const SAMPLES: Sample[] = [
  {
    id: 'sample-maya',
    file: 'maya.jpg',
    name: 'Maya',
    note: 'This is Maya, my manager at work, just back from parental leave',
    cues: { hair: 'Long dark hair', clothes: 'Mustard cardigan', other: 'Big warm laugh' },
  },
  {
    id: 'sample-arjun',
    file: 'arjun.jpg',
    name: 'Arjun',
    note: 'Arjun, my neighbour from flat 4, had knee surgery last month',
    cues: { hair: 'Short black hair, stubble', clothes: 'Navy hoodie', other: 'Walks a beagle called Biscuit' },
  },
  {
    id: 'sample-walter',
    file: 'walter.jpg',
    name: 'Walter',
    note: 'This is Walter, my piano teacher, his daughter just got married',
    cues: { glasses: 'Rimless glasses', hair: 'Grey hair', clothes: 'Always in a jacket' },
  },
];

/** A face that is never added: Whisper mode must label it "Not someone you've added". */
export const STRANGER_FILE = 'stranger.jpg';

const faceUrl = (file: string) => new URL(`demo/faces/${file}`, document.baseURI).href;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/** A few "photos" of the same face: as is, a little closer, a little darker, slightly turned. */
function variants(img: HTMLImageElement): HTMLCanvasElement[] {
  const size = 512;
  const make = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (ctx) draw(ctx);
    return c;
  };
  return [
    make((ctx) => ctx.drawImage(img, 0, 0, size, size)),
    make((ctx) => ctx.drawImage(img, size * 0.06, size * 0.06, size * 0.88, size * 0.88, 0, 0, size, size)),
    make((ctx) => {
      ctx.filter = 'brightness(0.82) contrast(1.05)';
      ctx.drawImage(img, 0, 0, size, size);
    }),
    make((ctx) => {
      ctx.translate(size / 2, size / 2);
      ctx.rotate(0.06);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    }),
  ];
}

export async function loadSamplePeople(onProgress?: (fraction: number) => void): Promise<number> {
  await loadEngine((f) => onProgress?.(f * 0.5));
  const existing = new Set((await listPeople()).map((p) => p.id));
  let added = 0;
  for (const [i, sample] of SAMPLES.entries()) {
    if (existing.has(sample.id)) continue;
    const img = await loadImage(faceUrl(sample.file));
    const descriptors: number[][] = [];
    let thumb = '';
    for (const canvas of variants(img)) {
      const result = await describe(canvas);
      if (result.ok) {
        descriptors.push(result.descriptor);
        if (!thumb) thumb = cropThumb(img, result.box);
      }
    }
    if (descriptors.length === 0) continue;
    const now = new Date().toISOString();
    const person: Person = {
      id: sample.id,
      name: sample.name,
      note: sample.note,
      whisper: makeWhisper(sample.name, sample.note),
      whisperSource: 'rules',
      cues: sample.cues,
      descriptors,
      thumb,
      consentAt: now,
      createdAt: now,
      updatedAt: now,
      sample: true,
    };
    await addOrUpdatePerson(person);
    added += 1;
    onProgress?.(0.5 + ((i + 1) / SAMPLES.length) * 0.5);
  }
  await refreshPeople();
  return added;
}

export async function removeSamplePeople(): Promise<void> {
  for (const p of await listPeople()) if (p.sample) await removePerson(p.id);
}

/* ---------- Demo camera ---------- */

const W = 480;
const H = 640;
const SCENE_W = 600;
const SCENE_H = 800;

/** Face feathered into a soft, blurred copy of its own background (like a shallow-focus phone photo). */
function buildScene(img: HTMLImageElement): HTMLCanvasElement {
  const scene = document.createElement('canvas');
  scene.width = SCENE_W;
  scene.height = SCENE_H;
  const ctx = scene.getContext('2d')!;
  const face = 270;
  const fx = (SCENE_W - face) / 2;
  const fy = 190;

  // Backdrop: the image stretched past the frame and blurred.
  const canFilter = typeof (ctx as { filter?: unknown }).filter === 'string';
  ctx.save();
  ctx.filter = 'blur(34px) saturate(0.85) brightness(0.96)';
  ctx.drawImage(img, -SCENE_W * 0.35, -SCENE_H * 0.1, SCENE_W * 1.7, SCENE_H * 1.25);
  ctx.restore();
  if (!canFilter) {
    // Browsers without canvas filters: a calm gradient instead of a blur.
    const g = ctx.createLinearGradient(0, 0, 0, SCENE_H);
    g.addColorStop(0, '#5b5f63');
    g.addColorStop(1, '#2b2f33');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SCENE_W, SCENE_H);
  }

  // Foreground: the face with a soft oval edge.
  const fg = document.createElement('canvas');
  fg.width = face;
  fg.height = face;
  const fctx = fg.getContext('2d')!;
  fctx.drawImage(img, 0, 0, face, face);
  fctx.globalCompositeOperation = 'destination-in';
  const mask = fctx.createRadialGradient(face / 2, face / 2, face * 0.3, face / 2, face / 2, face * 0.5);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  fctx.fillStyle = mask;
  fctx.fillRect(0, 0, face, face);
  ctx.drawImage(fg, fx, fy);
  return scene;
}

export interface DemoStream {
  stream: MediaStream;
  stop: () => void;
}

/**
 * A looping "camera" of the sample faces and one stranger, as a MediaStream,
 * so Whisper mode runs the exact same recognition path as with a real camera.
 */
export async function createDemoStream(): Promise<DemoStream> {
  const order = ['maya.jpg', STRANGER_FILE, 'arjun.jpg', 'walter.jpg'];
  const images = await Promise.all(order.map((f) => loadImage(faceUrl(f))));
  const scenes = images.map(buildScene);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  if (typeof canvas.captureStream !== 'function') throw new Error('This browser cannot run the demo camera');
  const stream = canvas.captureStream(15);

  const shot = 6500; // ms per person
  const fade = 700;
  const start = performance.now();
  let stopped = false;

  const drawScene = (scene: HTMLCanvasElement, t: number, phase: number, alpha: number) => {
    const x = 60 + 36 * Math.sin((2 * Math.PI * t) / 6000 + phase);
    const y = 80 + 22 * Math.sin((2 * Math.PI * t) / 4500 + phase);
    ctx.globalAlpha = alpha;
    ctx.drawImage(scene, x, y, W, H, 0, 0, W, H);
    ctx.globalAlpha = 1;
  };

  const frame = () => {
    if (stopped) return;
    const t = performance.now() - start;
    const index = Math.floor(t / shot) % scenes.length;
    const within = t % shot;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    drawScene(scenes[index], t, index, 1);
    if (within > shot - fade) {
      // Fade through dark to the next person, like a camera turning away.
      const k = (within - (shot - fade)) / fade;
      ctx.fillStyle = `rgba(0,0,0,${Math.sin(k * Math.PI) * 0.9})`;
      ctx.fillRect(0, 0, W, H);
      if (k > 0.5) drawScene(scenes[(index + 1) % scenes.length], t, index + 1, (k - 0.5) * 2);
    }
  };
  frame();
  // 15 frames a second is plenty for recognition and keeps the phone cool.
  const timer = setInterval(frame, 1000 / 15);

  return {
    stream,
    stop: () => {
      stopped = true;
      clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}
