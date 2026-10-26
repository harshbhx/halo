/**
 * The 2-minute demo walkthrough, recorded as a video with screenshots.
 * Run with `./run.sh record` (or `npm run demo:record`).
 *
 * The camera is Chromium's fake device playing demo/fake-camera/friend.y4m:
 * "Sam", an AI-generated face of a person who does not exist. The demo camera
 * later in the walk uses the built-in synthetic sample people.
 *
 * Output: docs/shots/walkthrough.webm and docs/shots/NN-*.png
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SAM_NOTE, takePhotos } from './helpers';

const OUT = 'docs/shots';

test.setTimeout(420_000);

/** Shows a soft circle where each tap lands, so taps are visible in the video. */
async function showTaps(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener(
      'pointerdown',
      (e) => {
        const dot = document.createElement('div');
        dot.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;
          background:rgba(30,107,92,.28);box-shadow:0 0 0 3px rgba(123,227,198,.9);pointer-events:none;z-index:99999;
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

async function tap(_page: Page, locator: ReturnType<Page['locator']>) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
}

test('demo walkthrough', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  // Timeline of the recording, for adding narration and the spoken whispers in an editor.
  const t0 = Date.now();
  const timeline: Array<{ t: number; event: string }> = [];
  const mark = (event: string) => timeline.push({ t: Math.round((Date.now() - t0) / 100) / 10, event });
  await showTaps(page);
  const shot = (name: string) => page.screenshot({ path: `${OUT}/${name}.png` });
  const pause = (ms: number) => page.waitForTimeout(ms);

  // 1. Welcome: the promise comes first.
  await page.goto('/');
  mark('Welcome screen');
  await expect(page.getByRole('heading', { name: "A quiet voice for faces you know." })).toBeVisible();
  await pause(2500);
  await shot('01-welcome');
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.wheel(0, 160);
    await pause(350);
  }
  await pause(1200);
  await shot('02-welcome-promises');
  mark('Tap: I understand, let\'s start');
  await tap(page, page.getByRole('button', { name: "I understand, let's start" }));

  // 2. Empty home.
  await expect(page.getByText('No one added yet')).toBeVisible();
  await pause(2200);
  await shot('03-home-empty');

  // 3. Enrol Sam (with consent).
  mark('Enrol: name and consent');
  await tap(page, page.getByRole('button', { name: 'Add someone' }).first());
  await pause(600);
  await page.getByLabel('Their name').pressSequentially('Sam', { delay: 120 });
  await pause(700);
  await tap(page, page.getByRole('button', { name: 'Continue' }));
  await expect(page.getByRole('heading', { name: 'Hi Sam.' })).toBeVisible();
  mark('Consent handoff: Sam taps I agree');
  await pause(2200);
  await shot('04-enrol-consent');
  await tap(page, page.getByRole('button', { name: 'I agree' }));

  await expect(page.getByRole('button', { name: /^Take photo/ })).toBeEnabled({ timeout: 120_000 });
  await pause(1500);
  await shot('05-enrol-camera');
  mark('Enrol: three photos');
  await takePhotos(page, 1);
  await pause(900);
  await takePhotos(page, 2);
  await pause(900);
  await takePhotos(page, 3);
  await pause(1500);
  await shot('06-enrol-three-photos');
  await tap(page, page.getByRole('button', { name: 'Continue' }));

  await pause(800);
  mark('Enrol: typing the note, whisper preview updates');
  await page.getByLabel('Your note').pressSequentially(SAM_NOTE, { delay: 38 });
  await pause(1800);
  await shot('07-enrol-note-whisper');
  await tap(page, page.getByRole('button', { name: 'Continue' }));

  await pause(600);
  mark('Enrol: cue notes');
  await page.getByLabel('Usual clothes').pressSequentially('Green raincoat', { delay: 60 });
  await page.getByLabel('Hair').pressSequentially('Brown hair with a fringe', { delay: 45 });
  await pause(1200);
  await shot('08-enrol-cues');
  await tap(page, page.getByRole('button', { name: 'Save Sam' }));
  await expect(page.getByRole('button', { name: /^Sam/ })).toBeVisible();
  await pause(2200);
  await shot('09-home-sam');

  // 4. Whisper mode: the kernel.
  mark('Tap: Whisper');
  await tap(page, page.getByRole('button', { name: 'Start Whisper mode' }));
  await expect(page.locator('.caption')).toContainText('Sam, your teammate from the hackathon', { timeout: 90_000 });
  mark('WHISPER (spoken): "Sam, your teammate from the hackathon. Loves climbing."');
  await pause(1500);
  await shot('10-whisper-sam');
  await pause(4500);
  mark('Tap caption: WHISPER repeats (spoken again)');
  await tap(page, page.locator('.caption'));
  await pause(3000);
  await tap(page, page.getByRole('button', { name: 'Close Whisper mode' }));

  // 5. Sample people + demo camera: recognised, and a stranger who stays unknown.
  await expect(page.getByRole('heading', { name: 'People you know' })).toBeVisible();
  await pause(800);
  await tap(page, page.getByRole('button', { name: 'Settings', exact: true }));
  await pause(900);
  mark('Settings: add sample people (AI-generated faces)');
  await tap(page, page.getByRole('button', { name: 'Add sample people' }));
  await expect(page.getByRole('button', { name: 'Remove sample people' })).toBeVisible({ timeout: 120_000 });
  await pause(800);
  await tap(page, page.getByRole('button', { name: 'People', exact: true }));
  await pause(1800);
  await shot('11-home-with-samples');
  mark('Tap: Open the demo camera');
  await tap(page, page.getByRole('button', { name: 'Open the demo camera' }));
  await expect(page.locator('.caption__name')).toHaveText('Maya', { timeout: 90_000 });
  mark('WHISPER (spoken): "Maya, your manager at work. Just back from parental leave."');
  await pause(1200);
  await shot('12-demo-maya');
  await expect(page.getByText("No one you've added")).toBeVisible({ timeout: 30_000 });
  mark('Stranger in view: "Not someone you\'ve added", nothing spoken');
  await pause(1800);
  await shot('13-demo-stranger-unknown');
  await expect(page.locator('.caption__name')).toHaveText('Arjun', { timeout: 30_000 });
  mark('WHISPER (spoken): "Arjun, your neighbour from flat 4. Knee surgery last month."');
  await pause(2000);
  await shot('14-demo-arjun');
  await pause(2500);
  await tap(page, page.getByRole('button', { name: 'Close Whisper mode' }));

  // 6. A person's page: consent date, fingerprints, edit, delete.
  await pause(800);
  mark('Person page: consent date, fingerprints, edit');
  await tap(page, page.getByRole('button', { name: /^Sam/ }));
  await pause(2000);
  await shot('15-person-sam');
  await page.mouse.wheel(0, 500);
  await pause(1200);
  await tap(page, page.getByRole('button', { name: 'Back to people' }));

  // 7. Settings, dark theme, privacy and limits.
  await pause(700);
  await tap(page, page.getByRole('button', { name: 'Settings', exact: true }));
  await pause(1500);
  await shot('16-settings');
  mark('Settings: voice, strictness, theme');
  await tap(page, page.getByRole('radio', { name: 'Dark' }));
  await pause(1200);
  await tap(page, page.getByRole('button', { name: 'People', exact: true }));
  await pause(1500);
  await shot('17-home-dark');
  mark('Privacy and honest limits');
  await tap(page, page.getByRole('button', { name: /On this phone only/ }));
  await pause(1500);
  await shot('18-privacy');
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.wheel(0, 220);
    await pause(380);
  }
  await pause(800);
  await tap(page, page.getByRole('button', { name: 'Back', exact: true }));

  // 8. Delete everything.
  await pause(900);
  await page.getByRole('button', { name: 'Delete everything' }).scrollIntoViewIfNeeded();
  await pause(800);
  mark('Delete everything');
  await tap(page, page.getByRole('button', { name: 'Delete everything' }));
  await pause(1500);
  await shot('19-delete-everything');
  await tap(page, page.getByRole('button', { name: 'Yes, delete everything' }));
  await expect(page.getByRole('heading', { name: "A quiet voice for faces you know." })).toBeVisible();
  mark('Back to a fresh start');
  await pause(2500);
  await shot('20-after-delete-welcome');
  mark('End');
  writeFileSync(`${OUT}/timeline.json`, JSON.stringify(timeline, null, 2));

  const video = page.video();
  await page.close();
  await video?.saveAs(`${OUT}/walkthrough.webm`);
});
