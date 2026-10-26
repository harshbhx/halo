import { expect, type Page } from '@playwright/test';

export const SAM_NOTE = 'This is Sam, my teammate from the hackathon, loves climbing';
export const SAM_WHISPER = 'Sam, your teammate from the hackathon. Loves climbing.';

/** Turn on the app's debug hook so tests can read match distances. */
export async function enableDebug(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __fwDebug: boolean }).__fwDebug = true;
  });
}

/** Takes shots until `count` good photos exist (a frame can occasionally miss). */
export async function takePhotos(page: Page, count: number) {
  const shutter = page.getByRole('button', { name: /^Take photo/ });
  await expect(shutter).toBeEnabled({ timeout: 120_000 });
  for (let tries = 0; tries < count + 6; tries += 1) {
    const taken = await page.getByRole('button', { name: /^Remove photo/ }).count();
    if (taken >= count) return;
    await page.getByRole('button', { name: /^Take photo/ }).click();
    await expect(page.getByRole('button', { name: /^Take photo/ })).toBeEnabled({ timeout: 60_000 });
    await page.waitForTimeout(400);
  }
  await expect(page.getByRole('button', { name: /^Remove photo/ })).toHaveCount(count);
}

/** First run shows the privacy promise; accept it. */
export async function passWelcome(page: Page) {
  await expect(page.getByRole('heading', { name: "Know who's in front of you." })).toBeVisible();
  await page.getByRole('button', { name: "I understand, let's start" }).click();
  await expect(page.getByRole('heading', { name: 'People you know' })).toBeVisible();
}

export async function enrolSam(page: Page) {
  await page.getByRole('button', { name: 'Add someone' }).first().click();
  await page.getByLabel('Their name').fill('Sam');
  const continueBtn = page.getByRole('button', { name: 'Continue' });
  await expect(continueBtn).toBeDisabled();
  await page.getByText('Sam agreed to be added').click();
  await continueBtn.click();

  await takePhotos(page, 3);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Your note').fill(SAM_NOTE);
  await expect(page.getByLabel('Whisper preview')).toHaveValue(SAM_WHISPER);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Usual clothes').fill('Green raincoat');
  await page.getByLabel('Hair').fill('Brown hair with a fringe');
  await page.getByRole('button', { name: 'Save Sam' }).click();
  await expect(page.getByRole('button', { name: /Sam/ }).first()).toBeVisible();
}
