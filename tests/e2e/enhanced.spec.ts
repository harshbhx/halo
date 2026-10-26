import { expect, test } from '@playwright/test';
import { APP, enrolSam } from './helpers';

test('default mode never calls the Enhanced mode server', async ({ page }) => {
  const api: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url());
  });
  await page.addInitScript(() => localStorage.setItem('fw.settings', JSON.stringify({ welcomeSeen: true })));
  await page.goto(APP);
  await enrolSam(page);
  await page.getByRole('button', { name: 'Try Whisper mode' }).click();
  await expect(page.locator('.caption')).toBeVisible({ timeout: 120_000 });
  expect(api).toEqual([]);
});

test('Enhanced mode sends only text, and the ledger lists every request', async ({ page }) => {
  const bodies: Array<{ path: string; body: string }> = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    bodies.push({ path, body: req.postData() ?? '' });
    if (path === '/api/session') return route.fulfill({ json: { token: '9999999999.test', expiresIn: 3600 } });
    if (path === '/api/translate') return route.fulfill({ json: { text: 'Sam, tu compañera del hackathon. Le encanta escalar.' } });
    if (path === '/api/voice') return route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.from('ID3') });
    return route.fulfill({ status: 404, json: { error: 'no' } });
  });
  await page.addInitScript(() =>
    localStorage.setItem('fw.settings', JSON.stringify({ welcomeSeen: true, enhanced: true, naturalVoice: true, whisperLang: 'es' })),
  );
  await page.goto(APP);
  await enrolSam(page);
  await expect.poll(() => bodies.map((b) => b.path), { timeout: 30_000 }).toContain('/api/voice');

  // Only text went out: no descriptors, no images, nothing large.
  for (const b of bodies) {
    expect(b.body).not.toMatch(/descriptor|data:image|thumb/);
    expect(b.body.length).toBeLessThan(400);
  }
  expect(bodies.find((b) => b.path === '/api/translate')?.body).toContain('Sam, your teammate from the hackathon');

  // The caption shows the translation, and the ledger shows each request.
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Privacy and honest limits/ }).click();
  await expect(page.getByText('faces, photos or face fingerprints sent. Ever.')).toBeVisible();
  await expect(page.getByText(/Whisper text to translate/)).toBeVisible();
  await expect(page.getByText(/^Whisper text, \d+ characters$/).first()).toBeVisible();
});
