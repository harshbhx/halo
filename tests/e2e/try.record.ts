/**
 * "Halo in 60 seconds", recorded as a phone-sized video: the guided try that
 * works before the tour and with no camera, using the AI-generated sample people.
 * Run with `./run.sh record`. Output: docs/shots/try-60-seconds.webm (and .mp4).
 */
import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { APP } from './helpers';

test.setTimeout(240_000);

test('Halo in 60 seconds', async ({ page }) => {
  mkdirSync('docs/shots', { recursive: true });
  await page.goto(APP);
  await expect(page.getByRole('heading', { name: 'A quiet voice for faces you know.' })).toBeVisible();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'See it in 60 seconds' }).click();
  await expect(page.getByRole('region', { name: 'Halo in 60 seconds' })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole('heading', { name: 'That’s Halo.' })).toBeVisible({ timeout: 120_000 });
  await page.waitForTimeout(3500);
  const video = page.video();
  await page.close();
  await video?.saveAs('docs/shots/try-60-seconds.webm');
});
