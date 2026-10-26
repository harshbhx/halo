/**
 * The app walkthrough, recorded as a phone-sized video with screenshots. It is a
 * reference for the click path in DEMO.md, not the submission video (that one is
 * recorded by hand on a real phone).
 * Run with `./run.sh record` (or `npm run demo:record`).
 *
 * The camera is Chromium's fake device playing demo/fake-camera/friend.y4m:
 * "Sam", an AI-generated face of a person who does not exist. The demo camera
 * later in the walk uses the built-in AI-generated sample people.
 *
 * Output: docs/shots/walkthrough.webm, docs/shots/walkthrough/NN-*.png and
 * docs/shots/walkthrough/timeline.json (what happens when, for editing).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { APP, SAM_NOTE, takePhotos } from './helpers';

const OUT = 'docs/shots';
const STILLS = `${OUT}/walkthrough`;

test.setTimeout(600_000);

/** Shows a soft indigo ring where each tap lands, so taps are visible in the video. */
async function showTaps(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener(
      'pointerdown',
      (e) => {
        const dot = document.createElement('div');
        dot.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;
          background:rgba(37,59,119,.22);box-shadow:0 0 0 3px rgba(37,59,119,.85);pointer-events:none;z-index:99999;
          transition:transform .45s ease-out,opacity .45s ease-out;`;
        document.body.appendChild(dot);
        requestAnimationFrame(() => {
          dot.style.transform = 'scale(1.6)';
          dot.style.opacity = '0';
        });
        setTimeout(() => dot.remove(), 500);
      },
      true,
    );
  });
}

async function tap(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
}

test('app walkthrough', async ({ page, context }) => {
  mkdirSync(STILLS, { recursive: true });
  const t0 = Date.now();
  const timeline: Array<{ t: number; event: string }> = [];
  const mark = (event: string) => timeline.push({ t: Math.round((Date.now() - t0) / 100) / 10, event });
  await showTaps(page);
  const shot = (name: string) => page.screenshot({ path: `${STILLS}/${name}.png` });
  const pause = (ms: number) => page.waitForTimeout(ms);
  const scroll = async (steps: number, by = 200) => {
    for (let i = 0; i < steps; i += 1) {
      await page.mouse.wheel(0, by);
      await pause(320);
    }
  };

  // 1. The tour and the earbud check.
  await page.goto(APP);
  await expect(page.getByRole('heading', { name: 'A quiet voice for faces you know.' })).toBeVisible();
  mark('Tour 1 of 3: who it is for');
  await pause(2500);
  await shot('01-tour');
  await tap(page.getByRole('button', { name: 'Next' }));
  mark('Tour 2 of 3: how it works');
  await pause(2000);
  await tap(page.getByRole('button', { name: 'Next' }));
  mark('Tour 3 of 3: the promise and the earbud check');
  await pause(1500);
  await tap(page.getByRole('button', { name: 'Check your earbud' }));
  await pause(1500);
  await shot('02-earbud-check');
  await tap(page.getByRole('button', { name: 'Yes, in my earbud' }));
  await pause(800);
  await tap(page.getByRole('button', { name: /I understand/ }));
  await expect(page.getByRole('heading', { name: 'Your people' })).toBeVisible();
  mark('Empty people list');
  await pause(1800);

  // 2. Add Sam: name, note, Sam's own yes, photos, cues.
  await tap(page.getByRole('button', { name: 'Add someone' }).first());
  mark('Add someone: name');
  await page.getByLabel('Their name').pressSequentially('Sam', { delay: 120 });
  await pause(700);
  await tap(page.getByRole('button', { name: 'Continue' }));
  mark('Add someone: typing the note; the whisper line updates');
  await page.getByLabel('Your note').pressSequentially(SAM_NOTE, { delay: 35 });
  await pause(1800);
  await shot('03-note');
  await tap(page.getByRole('button', { name: 'Continue' }));
  await expect(page.getByRole('heading', { name: 'Hi Sam.' })).toBeVisible();
  mark('Handoff: Sam reads the exact line and agrees');
  await pause(2500);
  await scroll(3);
  await tap(page.getByText('I’m Sam, and I agree'));
  await pause(900);
  await shot('04-their-yes');
  await tap(page.getByRole('button', { name: 'I agree' }));
  mark('Photos: three shots with the oval guide and light check');
  await takePhotos(page, 1);
  await pause(700);
  await takePhotos(page, 2);
  await pause(700);
  await takePhotos(page, 3);
  await pause(1200);
  await shot('05-photos');
  await tap(page.getByRole('button', { name: 'Continue' }));
  mark('Cue notes');
  await page.getByLabel('Usual clothes').pressSequentially('Green raincoat', { delay: 55 });
  await page.getByLabel('Hair').pressSequentially('Brown hair with a fringe', { delay: 45 });
  await page.getByLabel('Where you met, or when you last saw them').pressSequentially('At the climbing gym', { delay: 45 });
  await pause(1000);
  await tap(page.getByRole('button', { name: 'Save Sam' }));
  await expect(page.getByRole('heading', { name: 'Sam is added.' })).toBeVisible();
  mark('Saved');
  await pause(1800);

  // 3. Whisper mode: confident only after a steady view.
  await tap(page.getByRole('button', { name: 'Try Whisper mode' }));
  mark('Whisper mode opens: "Recognised on this phone only"');
  await expect(page.locator('.caption:not(.caption--maybe)')).toContainText('Sam, your teammate from the hackathon', { timeout: 120_000 });
  mark('Confident: halo, caption, whisper spoken: "Sam, your teammate from the hackathon. Loves climbing."');
  await pause(2500);
  await shot('06-whisper-sam');
  await tap(page.getByRole('button', { name: /Who was that/ }));
  mark('Who was that? The last few, in memory only');
  await pause(2200);
  await tap(page.getByRole('button', { name: 'Close', exact: true }));
  await pause(600);
  await tap(page.getByRole('button', { name: 'Close Whisper mode' }));

  // 4. Sample people, today's list.
  await tap(page.getByRole('button', { name: 'Settings', exact: true }));
  await pause(900);
  mark('Settings: add the AI-generated sample people');
  await tap(page.getByRole('button', { name: 'Add sample people' }));
  await expect(page.getByRole('button', { name: 'Remove sample people' })).toBeVisible({ timeout: 120_000 });
  await tap(page.getByRole('button', { name: 'Today', exact: true }));
  mark('Today: pick who you will see');
  await page.getByLabel('What’s the occasion? (optional)').pressSequentially('Dinner at Priya’s', { delay: 45 });
  for (const n of ['Maya', 'Arjun', 'Walter']) {
    await tap(page.locator('.pick', { hasText: n }).locator('input'));
    await pause(350);
  }
  await tap(page.getByRole('button', { name: /Make today’s list/ }));
  mark('Today’s list: lines and cues before you walk in');
  await pause(2200);
  await shot('07-today');
  mark('Event mode: Whisper mode looks only for these three');
  await tap(page.getByRole('switch', { name: /Event mode/ }));
  await pause(1600);
  await tap(page.getByRole('switch', { name: /Event mode/ }));
  await scroll(3);
  await pause(800);

  // 5. The demo camera: three sample people and one face never added.
  await tap(page.getByRole('button', { name: 'People', exact: true }));
  await pause(800);
  await tap(page.getByRole('button', { name: 'Open the demo camera' }));
  await expect(page.locator('.caption:not(.caption--maybe) .caption__name')).toHaveText('Maya', { timeout: 90_000 });
  mark('Demo camera: Maya, confident, "On today’s list"');
  await pause(1500);
  await shot('08-demo-maya');
  await expect(page.locator('.night__status')).toContainText('No match', { timeout: 40_000 });
  mark('A face never added: "No match", nothing spoken, nothing stored');
  await pause(400);
  await shot('09-no-match');
  await expect(page.locator('.caption:not(.caption--maybe) .caption__name')).toHaveText(/Arjun|Walter/, { timeout: 40_000 });
  mark('The next sample person');
  await pause(1500);
  mark('Pocket mode: screen dark and kept awake, whispers go to the earbud');
  await tap(page.getByRole('button', { name: /Pocket mode/ }));
  await pause(3500);
  await shot('09b-pocket-mode');
  await tap(page.getByRole('button', { name: 'Wake the screen' }));
  await pause(800);
  await tap(page.getByRole('button', { name: 'Close Whisper mode' }));

  // 6. Practice from cues.
  await tap(page.getByRole('button', { name: 'Practice', exact: true }));
  mark('Practice from cues');
  await pause(1200);
  await tap(page.getByRole('button', { name: /^Start \(/ }));
  await pause(2200);
  await shot('10-practice');
  await tap(page.locator('.choice').first());
  await pause(2000);

  // 7. Privacy: the ledger and the six limits.
  await tap(page.getByRole('button', { name: 'Settings', exact: true }));
  await pause(700);
  await tap(page.getByRole('button', { name: /Privacy and honest limits/ }));
  mark('Privacy: what has left this phone (nothing) and the six honest limits');
  await pause(2200);
  await shot('11-privacy');
  await scroll(8, 240);
  await pause(800);
  await tap(page.getByRole('button', { name: 'Back', exact: true }));

  // 8. Offline: the network goes away, recognition keeps working.
  mark('Network off (like airplane mode), page reloaded');
  await context.setOffline(true);
  await page.goto(APP);
  await expect(page.getByRole('heading', { name: 'Your people' })).toBeVisible({ timeout: 30_000 });
  await pause(1200);
  await tap(page.getByRole('button', { name: 'Open the demo camera' }));
  await expect(page.locator('.caption__name')).toHaveText(/Maya|Arjun|Walter/, { timeout: 90_000 });
  mark('Offline: still recognised on the phone');
  await pause(2000);
  await shot('12-offline');
  await tap(page.getByRole('button', { name: 'Close Whisper mode' }));
  await context.setOffline(false);

  // 9. Delete everything.
  await tap(page.getByRole('button', { name: 'Settings', exact: true }));
  await pause(700);
  await page.getByRole('button', { name: 'Delete everything' }).scrollIntoViewIfNeeded();
  await pause(900);
  mark('Delete everything');
  await tap(page.getByRole('button', { name: 'Delete everything' }));
  await pause(1500);
  await shot('13-delete');
  await tap(page.getByRole('button', { name: 'Yes, delete everything' }));
  await expect(page.getByRole('heading', { name: 'A quiet voice for faces you know.' })).toBeVisible();
  mark('A fresh start');
  await pause(2500);
  mark('End');
  writeFileSync(`${STILLS}/timeline.json`, JSON.stringify(timeline, null, 2));

  const video = page.video();
  await page.close();
  await video?.saveAs(`${OUT}/walkthrough.webm`);
});
