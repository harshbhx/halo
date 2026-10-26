import { expect, test } from '@playwright/test';
import { APP, enableDebug, passWelcome } from './helpers';

interface FrameEntry {
  personId: string | null;
  distance: number;
  runnerUp: number | null;
}

test('sample people are recognised and the stranger stays unknown', async ({ page }) => {
  await enableDebug(page);
  await page.goto(APP);
  await passWelcome(page);

  await page.getByRole('button', { name: 'Try with sample people' }).click();
  for (const name of ['Maya', 'Arjun', 'Walter']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${name}`) })).toBeVisible({ timeout: 120_000 });
  }
  await expect(page.getByText('Sample', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Arjun, your neighbour from flat 4. Knee surgery last month.')).toBeVisible();

  await page.getByRole('button', { name: 'Open the demo camera' }).click();
  await expect(page.locator('.night__status')).toContainText('Demo camera', { timeout: 60_000 });

  const seenCaptions = new Set<string>();
  const unknownDistances: number[] = [];
  const knownDistances: number[] = [];
  let captionOverStranger = 0;
  const deadline = Date.now() + 75_000;
  while (Date.now() < deadline && (seenCaptions.size < 3 || unknownDistances.length < 3)) {
    const caption = await page.locator('.caption__name').textContent({ timeout: 200 }).catch(() => null);
    if (caption) seenCaptions.add(caption.trim().toLowerCase());
    const status = await page.locator('.night__status').textContent({ timeout: 200 }).catch(() => '');
    if (caption && status?.includes("No one you've added")) captionOverStranger += 1;
    const frame = (await page.evaluate(() => (window as unknown as { __fwLastFrame?: unknown }).__fwLastFrame)) as
      | FrameEntry[]
      | undefined;
    for (const f of frame ?? []) {
      if (f.personId === null) unknownDistances.push(f.distance);
      else knownDistances.push(f.distance);
    }
    await page.waitForTimeout(250);
  }
  console.log('captions seen:', [...seenCaptions].join(', '));
  console.log('known distances (min/max):', Math.min(...knownDistances).toFixed(3), Math.max(...knownDistances).toFixed(3));
  console.log('stranger distances (min/max):', Math.min(...unknownDistances).toFixed(3), Math.max(...unknownDistances).toFixed(3));

  expect([...seenCaptions].sort()).toEqual(['arjun', 'maya', 'walter']);
  // A known person's caption is never left showing over the stranger (one transitional frame at most).
  expect(captionOverStranger).toBeLessThanOrEqual(1);
  expect(unknownDistances.length).toBeGreaterThan(0);
  // The stranger is never closer than the careful threshold to anyone.
  expect(Math.min(...unknownDistances)).toBeGreaterThan(0.45);
});
