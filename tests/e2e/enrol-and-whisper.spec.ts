import { expect, test } from '@playwright/test';
import { enableDebug, enrolSam, SAM_WHISPER } from './helpers';

test('enrol a person and hear their whisper in Whisper mode', async ({ page }) => {
  await enableDebug(page);
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[browser error]', msg.text());
  });
  await page.goto('/');
  await enrolSam(page);

  await page.getByRole('button', { name: 'Start Whisper mode' }).click();
  await expect(page.getByText('Recognised on this phone only')).toBeVisible();
  const caption = page.locator('.caption');
  await expect(caption).toContainText(SAM_WHISPER, { timeout: 120_000 });
  await expect(caption).toContainText('Green raincoat');
  await expect(page.locator('.whisper__status')).toContainText('Someone you know');

  const frame = await page.evaluate(() => (window as unknown as { __fwLastFrame?: unknown }).__fwLastFrame);
  console.log('last frame match:', JSON.stringify(frame));
  await page.screenshot({ path: 'test-results/whisper-sam.png' });
});
