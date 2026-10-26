/**
 * Real-product basics: the written documents, Your data and Wipe now, the app
 * lock (passcode and the phone's own lock), wrong-match reports and Help.
 */
import { expect, test, type Page } from '@playwright/test';
import { APP } from './helpers';

const seen = (extra: Record<string, unknown> = {}) => JSON.stringify({ welcomeSeen: true, ...extra });

async function withSamples(page: Page) {
  await page.addInitScript((s) => {
    if (!localStorage.getItem('fw.settings')) localStorage.setItem('fw.settings', s);
  }, seen());
  await page.goto(APP);
  await page.getByRole('button', { name: 'Try with sample people' }).click();
  await expect(page.getByRole('button', { name: /^Walter/ })).toBeVisible({ timeout: 120_000 });
}

test('the documents are written out and linked from the landing page and the app', async ({ page }) => {
  await page.goto('/');
  for (const [name, heading] of [
    ['Privacy', 'Privacy, in plain words'],
    ['Terms', 'Terms, in plain words'],
    ['Safety', 'Safety and honest limits'],
  ]) {
    await page.goto('/');
    await page.locator('.mast__links').getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
  await page.goto('/privacy/');
  await expect(page.getByText("connect-src 'self'")).toBeVisible();
  for (const route of ['/api/session', '/api/voice', '/api/translate', '/api/write']) await expect(page.locator(`[data-route="${route}"]`)).toBeVisible();
  await page.goto('/terms/');
  await expect(page.getByText('Not a medical device.')).toBeVisible();
  await page.goto('/safety/');
  await expect(page.getByText('Wrong person?')).toBeVisible();

  await page.addInitScript((s) => localStorage.setItem('fw.settings', s), seen());
  await page.goto(`${APP}#/settings`);
  await expect(page.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '../terms/');
  await page.getByRole('button', { name: /Help and questions/ }).click();
  await expect(page.getByRole('heading', { name: 'The camera won’t start' })).toBeVisible();
});

test('Your data shows what is stored, removes one person, and Wipe now empties everything', async ({ page }) => {
  await withSamples(page);
  // Let the service worker install so there is something to wipe.
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), { timeout: 30_000 }).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).length), { timeout: 30_000 }).toBeGreaterThan(0);

  await page.goto(`${APP}#/data`);
  await expect(page.getByRole('heading', { name: 'Your data' })).toBeVisible();
  await expect(page.locator('.data-rows')).toContainText('0 you added, and 3 sample people');
  await expect(page.locator('.data-rows')).toContainText('Nothing, ever');
  await page.getByRole('button', { name: 'Remove Walter' }).click();
  await page.getByRole('button', { name: 'Remove Walter', exact: true }).last().click();
  await expect(page.locator('.data-rows')).toContainText('and 2 sample people');

  await page.getByRole('button', { name: 'Wipe now' }).click();
  await page.getByRole('button', { name: 'Tap again to wipe everything now' }).click();
  await expect(page.getByRole('heading', { name: /wiped from this browser/ })).toBeVisible();
  const left = await page.evaluate(async () => ({
    databases: ((await indexedDB.databases?.()) ?? []).map((d) => d.name),
    caches: await caches.keys(),
    workers: (await navigator.serviceWorker.getRegistrations()).length,
    storage: localStorage.length,
  }));
  console.log('after Wipe now:', JSON.stringify(left));
  expect(left).toEqual({ databases: [], caches: [], workers: 0, storage: 0 });
});

test('passcode lock: only a hash is kept, the wrong code is refused, the right one opens Halo', async ({ page }) => {
  await page.addInitScript((s) => {
    if (!localStorage.getItem('fw.settings')) localStorage.setItem('fw.settings', s);
  }, seen());
  await page.goto(`${APP}#/settings`);
  await page.getByRole('radio', { name: 'A passcode' }).click();
  const sheet = page.getByRole('dialog', { name: 'Set a passcode' });
  await sheet.getByLabel('Passcode').fill('2468');
  await sheet.getByLabel('Same again').fill('2468');
  await sheet.getByRole('button', { name: 'Set passcode' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fw.settings') ?? '')).toContain('"kind":"passcode"');
  const stored = await page.evaluate(() => localStorage.getItem('fw.settings') ?? '');
  expect(stored).not.toContain('2468');
  expect(stored).toMatch(/"hash":"[A-Za-z0-9_-]{40,}"/);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Halo is locked' })).toBeVisible();
  await page.getByLabel('Passcode').fill('1111');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('alert')).toContainText('That’s not it');
  await page.getByLabel('Passcode').fill('2468');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await page.getByRole('button', { name: 'Lock now' }).click();
  await expect(page.getByRole('heading', { name: 'Halo is locked' })).toBeVisible();
});

test('phone lock: a WebAuthn credential on a virtual authenticator unlocks Halo', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });
  await page.addInitScript((s) => {
    if (!localStorage.getItem('fw.settings')) localStorage.setItem('fw.settings', s);
  }, seen());
  await page.goto(`${APP}#/settings`);
  await page.getByRole('radio', { name: 'Phone lock' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fw.settings') ?? '')).toContain('"kind":"device"');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Halo is locked' })).toBeVisible();
  await page.getByRole('button', { name: 'Unlock with this phone' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('a wrong match is reported on the phone and turns into a suggestion', async ({ page }) => {
  await withSamples(page);
  await page.getByRole('button', { name: 'Open the demo camera' }).click();
  const wrong = page.getByRole('button', { name: /Wrong person\? It wasn’t/ });
  await expect(wrong).toBeVisible({ timeout: 90_000 });
  const name = ((await wrong.textContent()) ?? '').replace(/.*It wasn’t /, '').trim();
  await wrong.click();
  await expect(page.getByText(`Noted on this phone: it wasn’t ${name}`)).toBeVisible();
  await page.getByRole('button', { name: 'Close Whisper mode' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Wrong matches' })).toBeVisible();
  await expect(page.getByText(`Add new photos of ${name}`)).toBeVisible();
  await page.goto(`${APP}#/data`);
  await expect(page.locator('.data-rows')).toContainText(/Wrong-match reports\s*1/);
});
