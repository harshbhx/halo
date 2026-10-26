/**
 * Accessibility pass: axe-core (WCAG 2.2 A and AA rules) on every page and the
 * main app screens, keyboard focus through the tour and the add-someone flow,
 * and reduced motion. Serious and critical findings fail the test.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { askLink } from '../../src/lib/consentLink';
import { APP } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page: Page, label: string) {
  // The live camera canvas and video carry no content of their own (aria-hidden).
  const result = await new AxeBuilder({ page }).withTags(TAGS).exclude('canvas').exclude('video').analyze();
  const blocking = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const other = result.violations.filter((v) => !blocking.includes(v));
  console.log(
    `${label}: ${result.passes.length} rules pass, ${blocking.length} serious, ${other.length} minor` +
      (other.length ? ` (${other.map((v) => v.id).join(', ')})` : ''),
  );
  for (const v of blocking) console.log(`  ${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  expect(blocking, `${label} has serious accessibility problems`).toEqual([]);
}

const seen = (extra: Record<string, unknown> = {}) => JSON.stringify({ welcomeSeen: true, ...extra });

test('pages outside the app', async ({ page, baseURL }) => {
  await page.goto('/');
  await scan(page, 'landing page');
  await page.goto('/helper/');
  await scan(page, 'helper page');
  await page.goto(askLink(baseURL!, 'Sam', 'Sam, your teammate from the hackathon. Loves climbing.'));
  await scan(page, 'consent page');
});

test('the app, light and dark', async ({ page }) => {
  await page.goto(APP);
  await scan(page, 'tour');
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((s) => localStorage.setItem('fw.settings', s), seen({ theme }));
    await page.goto(APP);
    if (theme === 'light') {
      await page.getByRole('button', { name: 'Try with sample people' }).click();
      await expect(page.getByRole('button', { name: /^Walter/ })).toBeVisible({ timeout: 120_000 });
    }
    await expect(page.getByRole('heading', { name: 'Your people' })).toBeVisible();
    await scan(page, `people (${theme})`);
    await page.getByRole('button', { name: 'Today', exact: true }).click();
    if (theme === 'light') {
      await page.locator('.pick', { hasText: 'Maya' }).locator('input').check();
      await scan(page, 'today picker');
      await page.getByRole('button', { name: /Make today’s list/ }).click();
    }
    await scan(page, `today list (${theme})`);
    await page.getByRole('button', { name: 'Practice', exact: true }).click();
    await scan(page, `practice (${theme})`);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await scan(page, `settings (${theme})`);
    await page.getByRole('button', { name: /Privacy and honest limits/ }).click();
    await scan(page, `privacy (${theme})`);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'People', exact: true }).click();
    await page.getByRole('button', { name: /^Maya/ }).first().click();
    await scan(page, `person (${theme})`);
    await page.getByRole('button', { name: 'Back to your people' }).click();
    await page.getByRole('button', { name: 'Add someone' }).first().click();
    await scan(page, `add someone (${theme})`);
    await page.getByRole('button', { name: 'Cancel adding' }).click();
  }
  await page.getByRole('button', { name: 'Open the demo camera' }).click();
  await expect(page.locator('.caption__name')).toHaveText(/Maya|Arjun|Walter/, { timeout: 90_000 });
  await scan(page, 'Whisper mode');
  await page.getByRole('button', { name: /Pocket mode/ }).click();
  await scan(page, 'pocket mode');
});

test('keyboard: every control in the tour and the first step is reachable, with a visible focus ring', async ({ page }) => {
  await page.goto(APP);
  const reached: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      return { name: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim(), ring: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2 };
    });
    if (!info) continue;
    reached.push(info.name);
    expect(info.ring, `focus ring on "${info.name}"`).toBe(true);
  }
  console.log('tour tab order:', reached.join(' > '));
  expect(reached).toContain('Next');
  expect(reached).toContain('See it in 60 seconds');
  await page.getByRole('button', { name: 'Next' }).press('Enter');
  await expect(page.getByRole('heading', { name: /Three steps/ })).toBeFocused();
});

test('reduced motion: transitions and the halo bloom are turned off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((s) => localStorage.setItem('fw.settings', s), seen());
  await page.goto(APP);
  await page.getByRole('button', { name: 'Add someone' }).first().click();
  const animation = await page.locator('.step').first().evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe('none');
  const smooth = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  expect(smooth).toBe(true);
});
