import { expect, test } from '@playwright/test';
import { askLink } from '../../src/lib/consentLink';
import { APP, takePhotos } from './helpers';

test('consent by link: they answer on their phone, the answer comes back in the link', async ({ page, baseURL }) => {
  const sent: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET') sent.push(r.url());
  });
  // Their phone: the link carries the question in the fragment.
  await page.goto(askLink(baseURL!, 'Sam', 'Sam, your teammate from the hackathon. Loves climbing.'));
  await expect(page.getByRole('heading', { name: 'Hi Sam.' })).toBeVisible();
  await expect(page.getByText('“Sam, your teammate from the hackathon. Loves climbing.”')).toBeVisible();
  await page.getByLabel('How should it introduce you?').fill('Sam from the climbing gym. Call me Sammy.');
  await page.getByLabel('Something that helps them spot you (optional)').fill('Green raincoat');
  await expect(page.getByRole('button', { name: 'Yes, send my answer' })).toBeDisabled();
  await page.getByText('I agree to be recognised on their phone').click();
  await page.getByRole('button', { name: 'Yes, send my answer' }).click();
  const answer = (await page.locator('[data-url]').textContent()) ?? '';
  expect(answer).toContain('/app/#/consent?d=');
  expect(sent).toEqual([]); // nothing was posted anywhere

  // Back on the owner's phone: the answer opens the app and starts adding Sam at the photos.
  await page.addInitScript(() => localStorage.setItem('fw.settings', JSON.stringify({ welcomeSeen: true })));
  await page.goto(answer);
  await expect(page.getByRole('heading', { name: 'Sam said yes.' })).toBeVisible();
  await expect(page.getByText('Sam from the climbing gym. Call me Sammy.')).toBeVisible();
  await page.getByRole('button', { name: /Add Sam/ }).click();
  await takePhotos(page, 3);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByLabel('Voice or anything else')).toHaveValue('Green raincoat');
  await page.getByRole('button', { name: 'Save Sam' }).click();
  await expect(page.getByRole('heading', { name: 'Sam is added.' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: /^Sam/ }).first().click();
  await expect(page.getByText(/Said yes by link/)).toBeVisible();
  expect(APP).toBe('/app/');
});
