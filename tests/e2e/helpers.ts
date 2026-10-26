import { expect, type Page } from '@playwright/test';

export const APP = '/app/';
export const SAM_NOTE = 'This is Sam, my teammate from the hackathon, loves climbing';
export const SAM_WHISPER = 'Sam, your teammate from the hackathon. Loves climbing.';

/** Turn on the app's debug hook so tests can read match distances. */
export async function enableDebug(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __fwDebug: boolean }).__fwDebug = true;
  });
}

/** First run is a three-part tour ending in the privacy promise. */
export async function passWelcome(page: Page) {
  await expect(page.getByRole('heading', { name: 'A quiet voice for faces you know.' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /I understand/ }).click();
  await expect(page.getByRole('heading', { name: 'Your people' })).toBeVisible();
}

/** Takes shots until `count` good photos exist (a frame can occasionally miss). */
export async function takePhotos(page: Page, count: number) {
  const shutter = page.getByRole('button', { name: /^Take photo/ });
  await expect(shutter).toBeEnabled({ timeout: 120_000 });
  for (let tries = 0; tries < count + 6; tries += 1) {
    const taken = await page.getByRole('button', { name: /^Remove photo/ }).count();
    if (taken >= count) return;
    await page.getByRole('button', { name: /^Take photo/ }).click();
    await expect(page.getByRole('button', { name: /^Take photo|^Reading photo/ })).toBeVisible();
    await page.waitForFunction(() => !document.querySelector('.shutter[aria-busy="true"]'), undefined, { timeout: 60_000 });
    await page.waitForTimeout(300);
  }
  await expect(page.getByRole('button', { name: /^Remove photo/ })).toHaveCount(count);
}

/** Adds Sam (an AI-generated face from the fake camera) and stops on the saved screen. */
export async function enrolSam(page: Page) {
  await page.getByRole('button', { name: 'Add someone' }).first().click();
  const continueBtn = page.getByRole('button', { name: 'Continue' });
  await expect(continueBtn).toBeDisabled();
  await page.getByLabel('Their name').fill('Sam');
  await continueBtn.click();

  await page.getByLabel('Your note').fill(SAM_NOTE);
  await expect(page.getByLabel('Whisper preview')).toHaveValue(SAM_WHISPER);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Sam is handed the phone, reads the line and says yes themselves.
  await expect(page.getByRole('heading', { name: 'Hi Sam.' })).toBeVisible();
  await expect(page.getByText(SAM_WHISPER)).toBeVisible();
  await expect(page.getByRole('button', { name: 'I agree' })).toBeDisabled();
  await page.getByText('I’m Sam, and I agree').click();
  await page.getByRole('button', { name: 'I agree' }).click();

  await takePhotos(page, 3);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Usual clothes').fill('Green raincoat');
  await page.getByLabel('Hair').fill('Brown hair with a fringe');
  await page.getByRole('button', { name: 'Save Sam' }).click();
  await expect(page.getByRole('heading', { name: 'Sam is added.' })).toBeVisible();
}

export async function enrolSamAndGoHome(page: Page) {
  await enrolSam(page);
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: /^Sam/ }).first()).toBeVisible();
}
