/**
 * Frame rate and work per second in Whisper mode, on the demo camera, with the
 * normal setting, with Battery saver, and with the page hidden.
 * Run with `npm run perf`. Output: eval/performance.json (numbers also in docs/accuracy.md).
 * Measured in headless Chromium with the WebAssembly backend on the build machine,
 * so the absolute numbers are for comparison, not a promise for any phone.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { APP, enableDebug } from './helpers';

test.setTimeout(300_000);

type Perf = { frames: number; busyMs: number; backend: string; detectMs: number };
const perf = (page: Page) => page.evaluate(() => (window as unknown as { __fwPerf?: Perf }).__fwPerf);

async function measure(page: Page, seconds: number) {
  const a = (await perf(page))!;
  const t0 = Date.now();
  await page.waitForTimeout(seconds * 1000);
  const b = (await perf(page)) ?? a;
  const elapsed = (Date.now() - t0) / 1000;
  const frames = b.frames - a.frames;
  return {
    seconds: Math.round(elapsed * 10) / 10,
    framesPerSecond: Math.round((frames / elapsed) * 10) / 10,
    busyShare: Math.round(((b.busyMs - a.busyMs) / (elapsed * 1000)) * 100) / 100,
    msPerFrame: frames ? Math.round((b.busyMs - a.busyMs) / frames) : 0,
    backend: b.backend,
  };
}

async function openDemo(page: Page) {
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page.getByRole('button', { name: 'Open the demo camera' }).click();
  await expect(page.locator('.caption__name')).toHaveText(/Maya|Arjun|Walter/, { timeout: 90_000 });
}

test('Whisper mode frame rate: normal, battery saver, hidden', async ({ page }) => {
  await enableDebug(page);
  await page.addInitScript(() => {
    if (!localStorage.getItem('fw.settings')) localStorage.setItem('fw.settings', JSON.stringify({ welcomeSeen: true }));
  });
  await page.goto(APP);
  await page.getByRole('button', { name: 'Try with sample people' }).click();
  await expect(page.getByRole('button', { name: /^Walter/ })).toBeVisible({ timeout: 120_000 });
  await openDemo(page);
  const normal = await measure(page, 20);

  await page.getByRole('button', { name: 'Close Whisper mode' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Battery saver' }).click();
  await openDemo(page);
  const saver = await measure(page, 20);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1500);
  const hidden = await measure(page, 10);

  const result = { measuredAt: new Date().toISOString(), where: 'headless Chromium, WebAssembly backend, demo camera, 390x844', normal, batterySaver: saver, hidden };
  console.log(JSON.stringify(result, null, 2));
  mkdirSync('eval', { recursive: true });
  writeFileSync('eval/performance.json', JSON.stringify(result, null, 2) + '\n');
  expect(saver.framesPerSecond).toBeLessThan(normal.framesPerSecond);
  expect(hidden.framesPerSecond).toBe(0);
});
