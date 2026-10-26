import { expect, test } from '@playwright/test';
import { enrolSam, passWelcome } from './helpers';

test('edit a person, then delete everything and start fresh', async ({ page }) => {
  await page.goto('/');
  await passWelcome(page);
  await enrolSam(page);

  // Edit the whisper on the person page.
  await page.getByRole('button', { name: /^Sam/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Sam' })).toBeVisible();
  await expect(page.getByText(/Agreed /)).toBeVisible();
  await page.getByLabel('Whisper', { exact: true }).fill('Sam, from the climbing gym. Owes you a coffee.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Saved')).toBeVisible();
  await page.getByRole('button', { name: 'Back to people' }).click();
  await expect(page.getByText('Sam, from the climbing gym. Owes you a coffee.')).toBeVisible();

  // The vault holds ciphertext, not readable names.
  const leaked = await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const req = indexedDB.open('face-whisper');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const rows: Array<{ data: ArrayBuffer }> = await new Promise((resolve) => {
      const req = db.transaction('people').objectStore('people').getAll();
      req.onsuccess = () => resolve(req.result);
    });
    db.close();
    return rows.some((r) => new TextDecoder().decode(new Uint8Array(r.data)).includes('Sam'));
  });
  expect(leaked).toBe(false);

  // Delete everything from Settings.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByRole('heading', { name: 'Delete everything?' })).toBeVisible();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();

  // Back to a first run with an empty vault.
  await passWelcome(page);
  await expect(page.getByText('No one added yet')).toBeVisible();
  const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  expect(dbs).not.toContain('face-whisper');
});
