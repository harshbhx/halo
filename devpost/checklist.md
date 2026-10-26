---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast. The slices were built and mechanically verified by the AI coding agent from Harsh's brief and decisions; the hands-on checkpoints, final review and learning wrap-up below are Harsh's to do and are left open on purpose.

## Slices

- [x] **1. Enrol someone and hear their whisper**
  Becomes usable: Add a person with consent, photos from the camera and a typed note; open Whisper mode, point the camera at them, see the ring and caption and hear the whisper.
  Why now: The kernel and the riskiest part (face-api under Vite, models in a headless browser with a fake camera). Bootstrapping lives inside it.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Features and Behavior > Recognising, carefully`
  Spec ref: `spec.md > Face engine`, `spec.md > Tracker and matcher`, `spec.md > Vault, stores and ledger`, `spec.md > Whisper writer and voice`
  Build: Scaffold Vite, React and TypeScript, copy model weights, face engine, matcher, vault, whisper writer, voice, enrolment and Whisper mode.
  Verify (mechanical): Unit tests pass; production build succeeds; Playwright with a synthetic-face fake camera enrols a person and Whisper mode shows their name and whisper.
  Learner check: Open the app on a phone, add a friend who agreed, open Whisper mode and point at them: you should hear their whisper and see the ring.
  Commit: `Enrol people and whisper their name on recognition`

- [x] **2. A calm, complete app around the kernel**
  Becomes usable: Tour, people list with edit and delete, settings, privacy and limits, Delete everything.
  Why now: The first 30 seconds depend on it, and Delete everything is a privacy promise that must be tested.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > App shell and navigation`, `spec.md > Screens`
  Build: Shell and routes, tour, people, person, settings, privacy.
  Verify (mechanical): Playwright edits a person, checks the database holds ciphertext, deletes everything and returns to the tour with no database left.
  Learner check: Go through the tour, edit a whisper, then Delete everything and confirm the app starts fresh.
  Commit: `Add welcome, people, settings and delete everything`

- [x] **3. Try it alone with synthetic sample people**
  Becomes usable: Three AI-generated sample people and a demo camera with one face that was never added.
  Why now: Lets anyone see recognition without a second person, and proves the no-match rule.
  PRD ref: `prd.md > Features and Behavior > Demo with sample people`
  Spec ref: `spec.md > Screens`
  Build: Sample faces with credits, on-device fingerprints for them, a canvas demo camera.
  Verify (mechanical): Playwright sees each sample name and "No match" for the extra face; distances logged.
  Learner check: Tap Try with sample people, open the demo camera, watch the names and the no-match face.
  Commit: `Add demo mode with synthetic sample people`

- [x] **4. Ready to demo and record**
  Becomes usable: `./run.sh`, a fake-camera browser, the recorded walkthrough, offline support.
  Why now: The submission needs a video.
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Build: Run script, fake-camera clips, recording script, service worker.
  Verify (mechanical): The offline test reloads with the network off and still recognises; the recording run writes a video and screenshots.
  Learner check: Run `./run.sh`, open the printed address, follow `DEMO.md`.
  Commit: `Add run.sh: serve, fake-camera browser, recorded walkthrough and tests`

- [x] **5. A designed product: Hallmark redesign and the landing page**
  Becomes usable: Every screen rebuilt on the Ribbon theme with the amber halo; a landing page at `/` with the app at `/app/`.
  Why now: Harsh judged the first version's design not good enough and asked for the Hallmark skill.
  PRD ref: `prd.md > Look and Feel`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Landing page`
  Build: Hallmark pre-flight and before record, theme deal, scaffolded tokens, app screens, landing page, sweeps and fresh-context reviews.
  Verify (mechanical): `sloplint --render` reports 0 FAIL on the app (scope app) and the landing page; all end-to-end tests pass.
  Learner check: Open the landing page and the app on a phone in light and dark; say what feels off.
  Commit: `Rebuild the app's design system on Hallmark's Ribbon theme`

- [x] **6. Today, Practice, backups and output modes**
  Becomes usable: A briefing list before an event, practice from cues, passphrase backups with a review step, voice, chime, buzz or silent.
  Why now: Preparation and cues are what people with face blindness already rely on.
  PRD ref: `prd.md > Features and Behavior > Preparing and practising`, `prd.md > Features and Behavior > Backups`
  Spec ref: `spec.md > Vault, stores and ledger`, `spec.md > Whisper writer and voice`
  Build: Today and Practice screens, the spaced schedule, backup files, output settings.
  Verify (mechanical): Unit tests for practice, backups and styles; screenshots of each screen.
  Learner check: Make a list for tomorrow and practise once.
  Commit: `Add today's list for briefing yourself before an event`

- [x] **7. Halo, ready to deploy**
  Becomes usable: The name Halo from one config file, a static build with a strict CSP and Cloudflare config.
  Why now: Harsh chose the name and the deployment target.
  PRD ref: `prd.md > Product Decisions`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Build: `brand.config.json`, icons, `_headers`, `robots.txt`, `wrangler.jsonc`, a server that applies the headers, an external-request check.
  Verify (mechanical): The build check finds no external request; Playwright runs every test under the CSP and asserts no request leaves the origin.
  Learner check: `./run.sh` and read the page title, the manifest and the headers.
  Commit: `Rename the product to Halo, with the name kept in one config file`

- [x] **8. Careful recognition and real consent**
  Becomes usable: Three states (confident, maybe, no match), the person's own yes on the phone or by link, child and look-alike handling, list limits, restore review, speaking only after an earbud check.
  Why now: The risk review showed a wrong name is worse than silence.
  PRD ref: `prd.md > Features and Behavior > Consent`, `prd.md > Features and Behavior > Recognising, carefully`
  Spec ref: `spec.md > Tracker and matcher`, `spec.md > Consent`
  Build: `FaceTracker`, the consent handoff and link, the honest-limits copy.
  Verify (mechanical): Tracker unit tests; the demo test sees confident names only after a steady view and never over the no-match face; the consent-link test posts nothing.
  Learner check: Add a friend with their own yes, then point at someone you didn't add.
  Commit: `Follow each face and give it one of three states: confident, maybe or no match`

- [x] **9. Optional Enhanced mode, text only**
  Becomes usable: A natural voice and translated whispers, a cloud writer, the privacy ledger, and the Worker source.
  Why now: Harsh allowed Cloudflare only as an opt-in that never touches faces.
  PRD ref: `prd.md > Features and Behavior > Enhanced mode (optional)`
  Spec ref: `spec.md > Enhanced mode`
  Build: `enhanced.ts`, `say.ts`, `ledger.ts`, the settings consent sheet, `worker/index.ts`.
  Verify (mechanical): Worker unit tests with Workers AI mocked; Playwright shows default mode makes no API call and Enhanced mode sends only short text that appears in the ledger.
  Learner check: Read the consent sheet and the ledger, then decide whether you'd turn it on.
  Commit: `Add the optional Enhanced mode Worker (source only) with guarded routes and tests`

- [x] **10. Hands-free and less said: pocket mode, event mode, quiet hours, never whisper**
  Becomes usable: Wear the phone at chest height with the screen dark; look only for today's people; quiet hours; a per-person never-whisper switch; where you met.
  Why now: The strongest objection in the research ("I'm not going to go around pointing my phone at everyone") and Harsh's call for more prize-worthy features.
  PRD ref: `prd.md > Features and Behavior > Hands-free: pocket mode`, `> Saying less: quiet hours and never whisper`, `> Preparing and practising`
  Spec ref: `spec.md > Output rules`, `spec.md > Pocket mode and the 60-second try`
  Build: `src/lib/rules.ts`, the pocket overlay and wake lock, the event switch on Today, quiet hours in Settings, `met` and `quiet` on each person.
  Verify (mechanical): Unit tests for quiet hours, output rules, buzz codes and event filtering; Playwright: pocket mode asks for a wake lock and buzzes the known code with nothing aloud; event mode names only the listed person over a full demo cycle; a never-whisper person is captioned and silent.
  Learner check: Hang the phone on a lanyard, turn on pocket mode, walk up to a friend you added.
  Commit: `Pocket mode, event mode, Halo in 60 seconds, spoken enrolment and where you met`

- [x] **11. Easier to start and to share: spoken enrolment, a helper, Halo in 60 seconds, an accessibility pass**
  Becomes usable: Add someone by saying one sentence; a trusted helper prepares cards by link; a guided minute with no camera; checked screen-reader, keyboard and reduced-motion support.
  Why now: Judges and new users need to see it working in a minute; families already help people with face blindness prepare.
  PRD ref: `prd.md > Features and Behavior > Spoken enrolment`, `> A helper`, `> Halo in 60 seconds`, `> Accessibility`
  Spec ref: `spec.md > Spoken enrolment and helper cards`, `spec.md > Pocket mode and the 60-second try`
  Build: `src/lib/intro.ts`, `src/lib/cardLink.ts`, `helper/`, `CardReceived`, the `#/try` route and coach, `tests/e2e/a11y.spec.ts`.
  Verify (mechanical): Unit tests for the intro parser and card links; Playwright: spoken enrolment fills every field; the helper card round trip posts nothing and still asks for the person's yes; the try finishes with two people and a no-match face; axe finds no serious or critical problems on any page or screen.
  Learner check: Send the helper page to someone at home and ask them to prepare one card.
  Commit: `Helper cards: a trusted person prepares a card as text and sends it as a link`

## Hands-on Checkpoints

- [ ] Early usable behavior explored: **Harsh**, on his own phone, adding a real friend who agrees.
- [ ] Final kick-the-tires exploration and feedback completed: **Harsh**.

## Final Review

- [ ] Final review complete: feedback resolved and **Harsh** confirms it's ready to ship.

What Harsh needs to do himself before submitting:
1. Spend 20 to 30 minutes with the app on his phone (`DEMO.md`, device test in `docs/device-test.md`): add a friend who agrees, try Whisper mode with an earbud, try the demo camera, Today and Practice. Note what he noticed and what he'd change, here under **Revisions** and in the Harsh notes in `scope.md`, `prd.md` and `spec.md`.
2. Decide on any changes from that session, then tick the two checkpoints and the final review only if they happened.
3. Do the learning wrap-up below with `devpost/app-map.html` and tick only what he actually did.
4. Make the repository public, record the video on a real phone and write the Devpost answers himself (`docs/submission-checklist.md`).

## Code Tour and App Map

- [ ] Learning activity complete: **Harsh** (guided route in `devpost/app-map.html`, or the focused alternative)
- [ ] Optional edit and transfer reflection addressed: **Harsh**
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse: generated by the agent from the final code; showing it and checking it with Harsh is still to do

Activity and evidence: not started (Harsh's step)
Route and stops: reference route in `devpost/app-map.html`, not yet toured
Edit outcome: not applicable yet
Reflection: not offered yet
Activity mode: pending

## Revisions

- Slice 1 also built the design tokens, bottom bar and people list: enrolment needed somewhere to land.
- Fake-camera clips are portrait 9:16 with the face at arm's length: Chromium delivers the clip at its native size, and a landscape clip cropped to a phone screen made the face fill the view.
- Added a WebAssembly fallback for the face engine: headless Chromium (and some phones) refuse a GPU context for TensorFlow.js, and plain JavaScript took 2.3 s a frame; WebAssembly brought it to about 0.1 s.
- The caption follows whoever was just recognised and disappears the moment a different face replaces them: the recording showed a name lingering over the wrong face.
- Enrolment refuses a shot far from the earlier ones (likely someone else) and warns about look-alikes.
- The service worker matches cached files ignoring `Vary`: the offline test found module scripts missing the cache.
- The whole look was rebuilt with the Hallmark skill at Harsh's request; the product was renamed Halo; the app moved to `/app/` with a landing page at `/`.
- Recognition moved from "3 of 4 frames per person" to one tracked face with three states, after a risk review: a short burst of frames let a look-alike through.
- Consent moved from a box the owner ticks to the person's own yes after reading the exact line, or a yes by link.
- Over-claims removed ("Know who's in front of you", "nothing like this ships"); prior art named; quotes replaced with verbatim wording Harsh checked; the six honest limits added.
- Optional Enhanced mode added at Harsh's decision: text only, off by default, with a ledger.
- Second feature round at Harsh's request: pocket mode, event mode, where you met, spoken enrolment, a helper, quiet hours and never whisper, Halo in 60 seconds, an accessibility pass.
- Helper cards are text only, not "photos and a note" as first asked: photos or face fingerprints in a link would leave the phone through the messaging app, which breaks the core promise. Photos are taken in person on the user's phone.
- The accessibility pass found focus staying on "Next" between tour parts (fixed: focus moves to each part's heading) and the tour footer overflowing a 375px screen (fixed).
