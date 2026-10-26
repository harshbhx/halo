import { expect, test } from '@playwright/test';
import { APP, passWelcome } from './helpers';

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto(APP);
  await passWelcome(page);

  // Wait until the service worker controls the page and has cached the face models.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          if (!navigator.serviceWorker.controller) return false;
          for (const key of await caches.keys()) {
            const cache = await caches.open(key);
            if (await cache.match('/models/face_recognition_model.bin')) return true;
          }
          return false;
        }),
      { timeout: 60_000 },
    )
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your people' })).toBeVisible();

  await page.getByRole('button', { name: 'Try with sample people' }).click();
  await expect(page.getByRole('button', { name: /^Maya/ })).toBeVisible({ timeout: 120_000 });
  await page.getByRole('button', { name: 'Open the demo camera' }).click();
  await expect(page.locator('.caption__name')).toHaveText(/Maya|Arjun|Walter/, { timeout: 90_000 });
  await context.setOffline(false);
});
