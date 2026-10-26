import { expect, test } from '@playwright/test';
import { APP, passWelcome } from './helpers';

test('makes no requests to any other origin, landing page and app included', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:')) outside.push(url);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A quiet voice for faces you know.' })).toBeVisible();
  await page.goto(APP);
  await passWelcome(page);
  await page.getByRole('button', { name: 'Try with sample people' }).click();
  await page.getByRole('button', { name: 'Open the demo camera' }).click();
  await expect(page.locator('.caption__name')).toBeVisible({ timeout: 90_000 });
  expect(outside).toEqual([]);
});

test('serves the strict security headers', async ({ request }) => {
  const res = await request.get('/app/');
  const csp = res.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("connect-src 'self'");
  expect(res.headers()['permissions-policy']).toContain('camera=(self)');
  expect(res.headers()['referrer-policy']).toBe('no-referrer');
});
