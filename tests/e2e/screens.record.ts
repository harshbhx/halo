/**
 * Evidence screenshots: every screen, in light and dark, on a phone and a
 * desktop, plus the product captures the landing page shows.
 * Run with `npm run screens` (or `./run.sh screens`).
 *
 * The camera is Chromium's fake device playing an AI-generated face ("Sam").
 * Output: docs/shots/<viewport>-<mode>/NN-screen.png and public/landing/shots/*.png
 */
import { expect, test, type Page } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';
import { askLink } from '../../src/lib/consentLink';
import { APP, SAM_NOTE, takePhotos } from './helpers';

test.setTimeout(600_000);

type Mode = 'light' | 'dark';
const LANDING = 'public/landing/shots';

const settle = (page: Page, ms = 450) => page.waitForTimeout(ms);

/** Lazy images load as they come into view, so scroll the whole page before a full-page capture. */
async function scrollThrough(page: Page) {
  // The landing page scrolls smoothly by default; jump instead, or the lazy images never come into view.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), undefined, { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  await settle(page, 600);
}

async function flow(page: Page, dir: string, captureLanding: boolean) {
  mkdirSync(dir, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: `${dir}/${name}.png` });
  const forLanding = async (name: string) => {
    if (captureLanding) await page.screenshot({ path: `${LANDING}/${name}.png` });
  };

  await page.goto(APP);
  await settle(page, 700);
  await shot('01-tour-welcome');
  await page.getByRole('button', { name: 'Next' }).click();
  await settle(page);
  await shot('02-tour-how');
  await page.getByRole('button', { name: 'Next' }).click();
  await settle(page);
  await shot('03-tour-promise');
  // The earbud check: confirming it lets Halo speak whispers.
  await page.getByRole('button', { name: 'Check your earbud' }).click();
  await settle(page, 300);
  await shot('03b-earbud-check');
  await page.getByRole('button', { name: 'Yes, in my earbud' }).click();
  await page.getByRole('button', { name: /I understand/ }).click();
  await settle(page);
  await shot('04-people-empty');

  // Enrolment: name, note, their own yes, photos, cues.
  await page.getByRole('button', { name: 'Add someone' }).first().click();
  await page.getByLabel('Their name').fill('Sam');
  await settle(page);
  await shot('05-enrol-name');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Your note').fill(SAM_NOTE);
  await settle(page);
  await shot('06-enrol-note');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Hi Sam.' })).toBeVisible();
  await page.getByText('I’m Sam, and I agree').click();
  await settle(page);
  await shot('07-enrol-their-yes');
  await forLanding('enrol-consent');
  await page.getByRole('button', { name: 'I agree' }).click();
  await takePhotos(page, 3);
  await settle(page);
  await shot('08-enrol-photos');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Usual clothes').fill('Green raincoat');
  await page.getByLabel('Hair').fill('Brown hair with a fringe');
  await page.getByLabel('Where you met, or when you last saw them').fill('At the climbing gym');
  await settle(page);
  await shot('09-enrol-cues');
  await page.getByRole('button', { name: 'Save Sam' }).click();
  await expect(page.getByRole('heading', { name: 'Sam is added.' })).toBeVisible();
  await settle(page, 1000);
  await shot('10-enrol-saved');

  // Whisper mode with the fake camera.
  await page.getByRole('button', { name: 'Try Whisper mode' }).click();
  await expect(page.locator('.caption:not(.caption--maybe)')).toContainText('Sam, your teammate', { timeout: 120_000 });
  await settle(page, 900);
  await shot('11-whisper-sam');
  await forLanding('whisper-sam');
  await page.getByRole('button', { name: /Who was that/ }).click();
  await settle(page, 500);
  await shot('12-who-was-that');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Close Whisper mode' }).click();

  // Sample people and the demo camera.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Add sample people' }).click();
  await expect(page.getByRole('button', { name: 'Remove sample people' })).toBeVisible({ timeout: 120_000 });
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await settle(page, 700);
  await shot('13-people');

  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await settle(page);
  await shot('14-today-pick');
  await page.getByLabel('What’s the occasion? (optional)').fill('Dinner at Priya’s');
  for (const n of ['Maya', 'Arjun', 'Walter']) await page.locator('.pick', { hasText: n }).locator('input').check();
  await page.getByRole('button', { name: /Make today’s list/ }).click();
  await settle(page);
  await shot('15-today-list');
  await forLanding('today');
  await page.getByRole('switch', { name: /Event mode/ }).click();
  await settle(page);
  await shot('15b-today-event-mode');
  await page.getByRole('switch', { name: /Event mode/ }).click();

  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await settle(page);
  await shot('16-practice-start');
  await page.getByRole('button', { name: /^Start \(/ }).click();
  await settle(page);
  await shot('17-practice-card');
  await forLanding('practice');
  await page.locator('.choice').first().click();
  await settle(page);
  await shot('18-practice-answer');

  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page.getByRole('button', { name: /^Sam/ }).first().click();
  await settle(page);
  await shot('19-person');
  await page.getByRole('button', { name: 'Back to your people' }).click();

  await page.getByRole('button', { name: 'Open the demo camera' }).click();
  await expect(page.locator('.caption:not(.caption--maybe) .caption__name')).toHaveText('Maya', { timeout: 90_000 });
  await settle(page, 1100);
  await shot('20-whisper-demo-maya');
  await forLanding('whisper-maya');
  await expect(page.locator('.night__status')).toContainText('No match', { timeout: 40_000 });
  await settle(page, 400);
  await shot('21-whisper-no-match');
  await forLanding('whisper-stranger');
  await page.getByRole('button', { name: /Pocket mode/ }).click();
  await expect(page.locator('.pocket__status')).toHaveText(/^(Maya|Arjun|Walter)\??$/, { timeout: 40_000 });
  await settle(page, 300);
  await shot('21b-pocket-mode');
  await page.getByRole('button', { name: 'Wake the screen' }).click();
  await page.getByRole('button', { name: 'Close Whisper mode' }).click();

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await settle(page);
  await shot('22-settings');
  await page.getByRole('switch', { name: 'Quiet hours' }).click();
  await page.getByRole('heading', { name: 'Pocket mode' }).scrollIntoViewIfNeeded();
  await page.getByRole('switch', { name: 'Quiet hours' }).scrollIntoViewIfNeeded();
  await settle(page);
  await shot('22b-settings-quiet-hours-pocket');
  await page.getByRole('switch', { name: 'Quiet hours' }).click();
  await page.getByRole('switch', { name: 'Use Enhanced mode' }).click();
  await settle(page, 600);
  await shot('23-enhanced-consent');
  await page.getByRole('button', { name: 'Keep everything' }).click();
  await page.getByRole('button', { name: /Back up or restore/ }).click();
  await settle(page);
  await shot('24-backup');
  await page.getByRole('button', { name: 'Back to settings' }).click();
  await page.getByRole('button', { name: /Privacy and honest limits/ }).click();
  await settle(page);
  await shot('25-privacy-ledger');
  await page.getByRole('button', { name: 'Back', exact: true }).click();

  // Your data, Help, a language, and the lock.
  await page.getByRole('button', { name: /Everything on this phone/ }).click();
  await settle(page);
  await shot('32-your-data');
  await page.getByRole('button', { name: 'Back to settings' }).click();
  await page.getByRole('button', { name: /Help and questions/ }).click();
  await settle(page);
  await shot('33-help');
  await page.getByRole('button', { name: 'Back to settings' }).click();
  await page.getByRole('radio', { name: 'हिन्दी' }).click();
  await page.getByRole('button', { name: 'लोग', exact: true }).click();
  await settle(page, 600);
  await shot('34-people-hindi');
  await page.getByRole('button', { name: 'सेटिंग्स', exact: true }).click();
  await page.getByRole('radio', { name: 'English' }).click();
  await page.getByRole('radio', { name: 'A passcode' }).click();
  const sheet = page.getByRole('dialog', { name: 'Set a passcode' });
  await sheet.getByLabel('Passcode').fill('2468');
  await sheet.getByLabel('Same again').fill('2468');
  await sheet.getByRole('button', { name: 'Set passcode' }).click();
  await expect(page.getByRole('button', { name: 'Lock now' })).toBeVisible();
  await page.getByRole('button', { name: 'Lock now' }).click();
  await expect(page.getByRole('heading', { name: 'Halo is locked' })).toBeVisible();
  await page.waitForTimeout(4500); // let the "Passcode set" note fade first
  await shot('35-lock-screen');
  await page.getByLabel('Passcode').fill('2468');
  await page.getByRole('button', { name: 'Open Halo' }).click();
}

for (const viewport of ['phone', 'desktop'] as const) {
  for (const mode of ['light', 'dark'] as Mode[]) {
    test.describe(`${viewport} ${mode}`, () => {
      if (viewport === 'desktop') test.use({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, hasTouch: false });
      test.use({ colorScheme: mode });
      test(`app screens, ${viewport}, ${mode}`, async ({ page }) => {
        if (viewport === 'phone' && mode === 'light') mkdirSync(LANDING, { recursive: true });
        await flow(page, `docs/shots/${viewport}-${mode}`, viewport === 'phone' && mode === 'light');
      });
      test(`landing and consent pages, ${viewport}, ${mode}`, async ({ page, baseURL }) => {
        const dir = `docs/shots/${viewport}-${mode}`;
        mkdirSync(dir, { recursive: true });
        await page.goto('/');
        await settle(page, 800);
        await page.screenshot({ path: `${dir}/00-landing-first-screen.png` });
        await scrollThrough(page);
        await page.screenshot({ path: `${dir}/00-landing-full.png`, fullPage: true });
        await page.goto(askLink(baseURL!, 'Sam', 'Sam, your teammate from the hackathon. Loves climbing.'));
        await settle(page, 600);
        await page.screenshot({ path: `${dir}/26-consent-link-page.png` });
        await page.goto('/helper/');
        await page.getByLabel('Who is it?').fill('Raj');
        await page.getByLabel('How do they know them?').fill('Raj, our neighbour, had knee surgery last month');
        await page.getByLabel('Usual clothes').fill('Green parka');
        await settle(page, 300);
        await page.screenshot({ path: `${dir}/30-helper-page.png` });
        await page.getByLabel(/Where they met/).fill('At the summer party');
        await page.getByLabel(/Your first name/).fill('Anu');
        await page.getByRole('button', { name: 'Make the card link' }).click();
        const link = (await page.locator('[data-url]').textContent()) ?? '';
        await page.evaluate(() => localStorage.setItem('fw.settings', JSON.stringify({ welcomeSeen: true })));
        await page.goto(link);
        await expect(page.getByRole('heading', { name: 'A card for Raj' })).toBeVisible();
        await settle(page, 400);
        await page.screenshot({ path: `${dir}/31-card-received.png` });
        for (const [n, doc] of [['36', 'privacy'], ['37', 'terms'], ['38', 'safety']]) {
          await page.goto(`/${doc}/`);
          await settle(page, 400);
          await page.screenshot({ path: `${dir}/${n}-${doc}-page.png` });
        }
      });
    });
  }
}

test('bigger text in the night theme, for the landing page', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fw.settings', JSON.stringify({ welcomeSeen: true, theme: 'dark', bigText: true }));
  });
  await page.goto(APP);
  await page.getByRole('button', { name: 'Try with sample people' }).click();
  await expect(page.getByRole('button', { name: /^Maya/ })).toBeVisible({ timeout: 120_000 });
  await page.mouse.move(1, 1);
  await settle(page, 800);
  mkdirSync(LANDING, { recursive: true });
  await page.screenshot({ path: `${LANDING}/bigtext-night.png` });
  mkdirSync('docs/shots/phone-dark', { recursive: true });
  copyFileSync(`${LANDING}/bigtext-night.png`, 'docs/shots/phone-dark/27-bigger-text.png');
});

test('sample people only, as a first visit sees them, for the landing page', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fw.settings', JSON.stringify({ welcomeSeen: true }));
  });
  await page.goto(APP);
  await page.getByRole('button', { name: 'Try with sample people' }).click();
  await expect(page.getByRole('button', { name: /^Maya/ })).toBeVisible({ timeout: 120_000 });
  await page.mouse.move(1, 1);
  await settle(page, 800);
  mkdirSync(LANDING, { recursive: true });
  await page.screenshot({ path: `${LANDING}/people.png` });
});

test('Halo in 60 seconds, phone', async ({ page }) => {
  test.setTimeout(240_000);
  for (const mode of ['light', 'dark'] as Mode[]) {
    await page.emulateMedia({ colorScheme: mode });
    await page.evaluate(() => localStorage.clear()).catch(() => undefined);
    await page.goto('about:blank'); // a hash-only change wouldn't reload the app
    await page.goto(`${APP}#/try`);
    await expect(page.getByRole('region', { name: 'Halo in 60 seconds' })).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('.caption:not(.caption--maybe) .caption__name')).toHaveText(/Maya|Arjun|Walter/, { timeout: 90_000 });
    await settle(page, 900);
    await page.screenshot({ path: `docs/shots/phone-${mode}/28-try-60-seconds.png` });
    await expect(page.getByRole('heading', { name: 'That’s Halo.' })).toBeVisible({ timeout: 120_000 });
    await settle(page, 500);
    await page.screenshot({ path: `docs/shots/phone-${mode}/29-try-done.png` });
  }
});
