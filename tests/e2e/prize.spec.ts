/**
 * The second round of features: Halo in 60 seconds, pocket mode, event mode,
 * spoken enrolment with where-you-met and never-whisper, and helper cards.
 */
import { expect, test, type Page } from '@playwright/test';
import { APP, enableDebug, takePhotos } from './helpers';

/** Records vibration, speech and wake-lock calls instead of performing them. */
async function recordOutputs(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vibes: number[][]; __spoken: string[]; __wake: number };
    w.__vibes = [];
    w.__spoken = [];
    w.__wake = 0;
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (p: number | number[]) => {
        w.__vibes.push(Array.isArray(p) ? p : [p]);
        return true;
      },
    });
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          w.__wake += 1;
          return { release: async () => undefined, addEventListener: () => undefined };
        },
      },
    });
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      synth.speak = (u: SpeechSynthesisUtterance) => {
        w.__spoken.push(u.text);
        setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 30);
      };
    }
  });
}

const seenSettings = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ welcomeSeen: true, ...extra });

async function withSamples(page: Page, settings: Record<string, unknown> = {}) {
  await page.addInitScript((s) => localStorage.setItem('fw.settings', s), seenSettings(settings));
  await page.goto(APP);
  await page.getByRole('button', { name: 'Try with sample people' }).click();
  await expect(page.getByRole('button', { name: /^Walter/ })).toBeVisible({ timeout: 120_000 });
}

test('Halo in 60 seconds: works before the tour, with no camera', async ({ page }) => {
  await page.goto(`${APP}#/try`);
  await expect(page.getByRole('region', { name: 'Halo in 60 seconds' })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/Step 1 of 3/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play whispers aloud' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('heading', { name: 'That’s Halo.' })).toBeVisible({ timeout: 120_000 });
  const summary = (await page.locator('#try-done + p').textContent()) ?? '';
  console.log('60-second try:', summary);
  expect(summary).toMatch(/Recognised: \w+, \w+/);
  expect(summary).toContain('One face was never added');
  await page.getByRole('button', { name: 'Start with the short tour' }).click();
  await expect(page.getByRole('heading', { name: 'A quiet voice for faces you know.' })).toBeVisible();
});

test('pocket mode: a dark screen that stays awake, and buzz codes without an earbud', async ({ page }) => {
  await recordOutputs(page);
  await withSamples(page);
  await page.getByRole('button', { name: 'Open the demo camera' }).click();
  await expect(page.locator('.night__status')).toContainText('Demo camera', { timeout: 60_000 });
  await page.getByRole('button', { name: /Pocket mode/ }).click();
  const pocket = page.getByRole('dialog', { name: 'Pocket mode' });
  await expect(pocket).toBeVisible();
  await expect(pocket).toContainText('Buzz codes only');
  await expect(pocket.locator('.pocket__status')).toHaveText(/^(Maya|Arjun|Walter)$/, { timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __wake: number }).__wake)).toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __vibes: number[][] }).__vibes.map((v) => v.join(','))), { timeout: 30_000 })
    .toContain('60,90,60');
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
  expect(spoken.filter((t) => t.trim())).toEqual([]); // no earbud check yet: nothing said aloud (blank lines unlock audio)
  await pocket.getByRole('button', { name: 'Wake the screen' }).click();
  await expect(pocket).toBeHidden();
  await expect(page.getByRole('button', { name: 'Close Whisper mode' })).toBeVisible();
});

test('event mode: only the people on today’s list are looked for', async ({ page }) => {
  await enableDebug(page);
  await withSamples(page);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByLabel('What’s the occasion? (optional)').fill('Dinner at Priya’s');
  await page.locator('.pick', { hasText: 'Maya' }).locator('input').check();
  await page.getByRole('button', { name: /Make today’s list/ }).click();
  await page.getByRole('switch', { name: /Event mode/ }).click();
  await expect(page.getByRole('switch', { name: /Event mode/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page.getByRole('button', { name: 'Open the demo camera' }).click();
  await expect(page.getByText(/Event: Dinner at Priya’s/)).toBeVisible({ timeout: 60_000 });

  const named = new Set<string>();
  let noMatchFrames = 0;
  const started = Date.now();
  while (Date.now() - started < 34_000) {
    const caption = await page.locator('.caption:not(.caption--maybe) .caption__name').textContent({ timeout: 200 }).catch(() => null);
    if (caption) named.add(caption.trim());
    const frame = (await page.evaluate(() => (window as unknown as { __fwLastFrame?: Array<{ state: string }> }).__fwLastFrame)) ?? [];
    noMatchFrames += frame.filter((f) => f.state === 'unsure').length;
    await page.waitForTimeout(250);
  }
  console.log('event mode named:', [...named].join(', '), 'no-match frames:', noMatchFrames);
  expect([...named]).toEqual(['Maya']);
  expect(noMatchFrames).toBeGreaterThan(10); // Arjun, Walter and the stranger all stay "No match"
});

test('spoken enrolment fills the fields; where you met shows; never whisper stays silent', async ({ page }) => {
  await recordOutputs(page);
  await page.addInitScript(() => {
    // A stand-in for the browser's speech recognition: it "hears" one sentence.
    class FakeRecognition {
      lang = 'en-GB';
      interimResults = true;
      continuous = true;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          const text = 'This is Raj, my neighbour, had knee surgery last month, wears a green parka, has round glasses, we met at the climbing gym';
          this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
          this.onend?.();
        }, 300);
      }
      stop() {}
      abort() {}
    }
    // Newer Chromium has the unprefixed constructor too; replace both.
    Object.assign(window, { SpeechRecognition: FakeRecognition, webkitSpeechRecognition: FakeRecognition });
    localStorage.setItem('fw.settings', JSON.stringify({ welcomeSeen: true, speakAllowed: true }));
  });
  await page.goto(APP);
  await page.getByRole('button', { name: 'Add someone' }).first().click();
  await page.getByRole('button', { name: 'Or say it all at once' }).click();
  await expect(page.getByText('Filled in from what you said')).toBeVisible();
  await expect(page.getByLabel('Your note')).toHaveValue('This is Raj, my neighbour, had knee surgery last month');
  await expect(page.getByLabel('Whisper preview')).toHaveValue('Raj, your neighbour. Knee surgery last month.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Hi Raj.' })).toBeVisible();
  await page.getByText('I’m Raj, and I agree').click();
  await page.getByRole('button', { name: 'I agree' }).click();
  await takePhotos(page, 3);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByLabel('Usual clothes')).toHaveValue('Green parka');
  await expect(page.getByLabel('Glasses or accessories')).toHaveValue('Round glasses');
  await expect(page.getByLabel('Where you met, or when you last saw them')).toHaveValue('At the climbing gym');
  await page.getByRole('button', { name: 'Save Raj' }).click();
  await page.getByRole('button', { name: 'Done' }).click();

  // Never whisper Raj.
  await page.getByRole('button', { name: /^Raj/ }).first().click();
  await expect(page.getByLabel('Where you met, or when you last saw them')).toHaveValue('At the climbing gym');
  await page.getByRole('switch', { name: 'Never whisper Raj' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: 'Back to your people' }).click();

  await page.getByRole('button', { name: 'Start Whisper mode' }).click();
  const caption = page.locator('.caption:not(.caption--maybe)');
  await expect(caption).toContainText('Raj, your neighbour', { timeout: 120_000 });
  await expect(caption).toContainText('Never whispered');
  await expect(caption).toContainText('Where you met: At the climbing gym');
  await page.waitForTimeout(1500);
  const outputs = await page.evaluate(() => {
    const w = window as unknown as { __vibes: number[][]; __spoken: string[] };
    return { vibes: w.__vibes, spoken: w.__spoken };
  });
  expect(outputs.spoken.filter((t) => t.trim())).toEqual([]);
  expect(outputs.vibes.filter((v) => v.length > 1)).toEqual([]); // no buzz code for a never-whisper person
});

test('helper card: prepared as text on another phone, checked and added here', async ({ page, baseURL }) => {
  const sent: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET') sent.push(r.url());
  });
  await page.goto('/helper/');
  await page.getByLabel('Who is it?').fill('Raj');
  await page.getByLabel('How do they know them?').fill('Raj, our neighbour, had knee surgery last month');
  await expect(page.locator('[data-line]')).toHaveText('“Raj, your neighbour. Knee surgery last month.”');
  await page.getByLabel('Usual clothes').fill('Green parka');
  await page.getByLabel(/Where they met/).fill('At the summer party');
  await page.getByLabel(/Your first name/).fill('Anu');
  await page.getByRole('button', { name: 'Make the card link' }).click();
  const link = (await page.locator('[data-url]').textContent()) ?? '';
  expect(link.startsWith(`${baseURL}/app/#/card?d=`)).toBe(true);
  expect(link).not.toMatch(/image|jpeg|descriptor/i);
  expect(sent).toEqual([]);

  await page.addInitScript(() => localStorage.setItem('fw.settings', JSON.stringify({ welcomeSeen: true })));
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'A card for Raj' })).toBeVisible();
  await expect(page.getByText('Anu prepared it')).toBeVisible();
  await expect(page.getByText('Where you met: At the summer party')).toBeVisible();
  await page.getByRole('button', { name: 'Start adding Raj' }).click();
  await expect(page.getByText('Prepared by Anu')).toBeVisible();
  await expect(page.getByLabel('Whisper preview')).toHaveValue('Raj, your neighbour. Knee surgery last month.');
  await page.getByRole('button', { name: 'Continue' }).click();
  // Raj still says yes himself, and his photos are taken here.
  await expect(page.getByRole('heading', { name: 'Hi Raj.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'I agree' })).toBeDisabled();
});
