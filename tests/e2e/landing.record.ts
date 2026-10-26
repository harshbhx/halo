/**
 * A short scroll through the landing page, recorded as a desktop-sized video:
 * the hero, the quotes, the note box turning a note into a whisper, the
 * instrument, the evening screens, the promise and the honest limits.
 * Run with `./run.sh record` (or `npm run demo:record`).
 *
 * Output: docs/shots/landing-scroll.webm (and .mp4 when ffmpeg is installed).
 */
import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/shots';

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false, video: { mode: 'on', size: { width: 1280, height: 800 } } });
test.setTimeout(180_000);

async function glide(page: Page, to: string, ms: number) {
  // A slow, even scroll to a section, so the video reads like someone browsing.
  await page.evaluate(
    async ({ selector, duration }) => {
      const el = document.querySelector(selector);
      if (!el) return;
      const start = window.scrollY;
      const end = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 24);
      const t0 = performance.now();
      await new Promise<void>((done) => {
        const step = (now: number) => {
          const k = Math.min((now - t0) / duration, 1);
          const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          window.scrollTo({ top: start + (end - start) * ease, behavior: 'instant' as ScrollBehavior });
          if (k < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      });
    },
    { selector: to, duration: ms },
  );
}

test('landing page scroll', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: 'Hear a whisper' }).click();
  await page.waitForTimeout(1500);

  await glide(page, '.words', 1400);
  await page.waitForTimeout(2000);
  await glide(page, '.stage:nth-child(1)', 1200);
  await page.waitForTimeout(1500);
  await glide(page, '.stage:nth-child(2)', 1400);
  const note = page.locator('#note-input');
  await note.fill('');
  await note.pressSequentially('This is Priya, my sister-in-law, just moved to Pune', { delay: 28 });
  await page.waitForTimeout(1200);
  await glide(page, '.stage:nth-child(3)', 1400);
  await page.locator('label[for="st-warm"]').click();
  await page.waitForTimeout(900);
  await page.locator('label[for="st-full"]').click();
  await page.waitForTimeout(1200);
  await glide(page, '.stage:nth-child(4)', 1200);
  await page.waitForTimeout(1500);
  await glide(page, '.evening', 1200);
  await page.waitForTimeout(1600);
  await glide(page, '.promise', 1200);
  await page.waitForTimeout(1800);
  await glide(page, '.limits', 1200);
  await page.waitForTimeout(2200);
  await glide(page, '.close', 1400);
  await page.waitForTimeout(1500);

  const video = page.video();
  await page.close();
  await video?.saveAs(`${OUT}/landing-scroll.webm`);
});
