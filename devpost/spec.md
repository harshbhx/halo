---
doc: spec
status: approved
---

# Face Whisper — Technical Spec

> Process note: the stack and privacy constraints come from Harsh's brief (on-device face matching with face-api.js or a similar library, browser storage, browser speech, works with no key). Choices the brief left open are marked **Recommendation (accepted)**: the build agent proposed them and they were accepted under the brief's "work autonomously" instruction.

## How This Works, In Plain Language
Face Whisper is a single web page that runs on the phone. Nothing it learns about faces goes to a server, because there is no server: the page is static files.

- **The face reader** is a small neural network that runs inside the browser. It finds faces in a camera frame and turns each one into a *face fingerprint*: a list of 128 numbers. Two photos of the same person give fingerprints that are close together; different people are further apart.
- **Enrolling** someone means taking 3 to 5 photos, turning each into a fingerprint, and saving the fingerprints with the person's name, the note and the whisper. The photos themselves are not kept, only one small thumbnail for the people list.
- **The vault** is the browser's own database on the phone (IndexedDB). Everything in it is encrypted with a key the browser creates and refuses to export. "Delete everything" wipes both the data and the key.
- **The whisper writer** turns a note into one short line. It is a set of plain rules (swap "my" for "your", drop "This is", keep the facts), so it needs no internet and no key. If the browser offers a built-in on-device language model, it can be used instead.
- **Whisper mode** reads the camera a few times a second, makes fingerprints of the faces it sees, and compares them with the saved ones. If one is close enough for several frames in a row, it draws a soft ring and speaks the whisper with the browser's own voice. Fingerprints of faces that match no one are thrown away straight after the comparison.

Why this shape: it is the smallest design that keeps the privacy promise. Every extra service (a server, an account, a cloud model) would be a new place a face could leak.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. The user opens the page → `App` checks the settings store for "welcome seen" → shows `Welcome`.
2. Taps start → settings store saves the flag → `Home` loads people from the vault (decrypting each record) → empty state.
3. **Add someone** → `Enrol` step 1 (`ConsentStep`) → name plus consent tick enable Continue.
4. `PhotoStep` opens the camera through `camera.ts` → each shutter tap grabs a frame → `faceEngine.describe()` finds exactly one face, returns its fingerprint and a cropped thumbnail → kept in memory.
5. `NoteStep` → dictation (`dictation.ts`, browser speech recognition) or typing → `whisper.ts` makes the preview line → editable.
6. `CuesStep` → Save → `vault.savePerson()` encrypts the record and writes it to IndexedDB → back to `Home`.
7. **Whisper** → `WhisperMode` starts the camera (or the demo camera) → a frame loop calls `faceEngine.detectAll()` → `matcher.ts` compares each fingerprint with the enrolled ones and keeps a short streak per person → when a streak is steady, `Overlay` draws the ring and `voice.ts` speaks the whisper, then a cool-down starts.
8. **Delete everything** in `Settings` → `vault.wipe()` deletes the database and key, clears settings → `Welcome`.

## Stack
- **TypeScript 5.9 + React 19 + Vite 7** — a static single-page app; React keeps seven screens and their state manageable. Docs: https://react.dev, https://vite.dev. **Recommendation (accepted).**
- **@vladmandic/face-api 1.7** — maintained fork of face-api.js with TensorFlow.js bundled; TinyFaceDetector + 68-point tiny landmarks + FaceRecognitionNet (128-number descriptors). Model weights (about 6.5 MB) ship with the app and are cached after first load. Docs: https://github.com/vladmandic/face-api. Named in the brief.
- **idb 8** — small promise wrapper for IndexedDB. Docs: https://github.com/jakearchibald/idb.
- **Web Crypto (AES-GCM 256)** — built into browsers. Docs: https://developer.mozilla.org/docs/Web/API/SubtleCrypto.
- **Web Speech API** — `speechSynthesis` for the whisper voice, `SpeechRecognition` for dictation where available. Docs: https://developer.mozilla.org/docs/Web/API/Web_Speech_API.
- **Chrome built-in AI (optional)** — `LanguageModel` Prompt API if the browser exposes it and the model is already available; never required. Docs: https://developer.chrome.com/docs/ai/built-in.
- **Atkinson Hyperlegible Next** via @fontsource, self-hosted. Docs: https://www.brailleinstitute.org/freefont/.
- **lucide-react** icons. Docs: https://lucide.dev.
- **Vitest 3 + fake-indexeddb** for unit tests; **Playwright 1.61** with Chromium's fake camera for the end-to-end flow, screenshots and demo video. Docs: https://vitest.dev, https://playwright.dev.

Unverified at planning time, to check in slice 1: that the bundled face-api build runs under Vite 7 and loads the models in headless Chromium with a fake camera.

## Where It Runs and How Someone Tries It
- Runtime: any modern phone or desktop browser. The camera needs a secure origin, so use `http://localhost` or HTTPS.
- Requirements: Node 20+ and npm. No API keys. `.env.example` documents that none are needed.
- Start: `./run.sh` (installs on first run, builds, serves on http://localhost:4173). Open it on the same machine, or tunnel it over HTTPS to try it on a phone.
- Demo without a person: `./run.sh fake-camera` opens Chromium with a synthetic-face video as the camera (`scripts/make-fake-camera.sh` builds the clips with ffmpeg). In-app, **Try with sample people** plus the **demo camera** works in any browser.
- Recording: `npm run demo:record` runs the whole click path in Playwright with the fake camera and writes a video and screenshots to `docs/shots/`.
- Submission needs a short demo video and a public GitHub repository; Harsh makes the repository public himself. Deployment is optional and not planned for this build (Harsh asked to keep everything local for now).

## Look and Feel
From `prd.md > Look and Feel`.
- Palette (light): paper `#F6F3EE` background, white cards, ink `#15191F` text, muted `#4B5563`, accent deep teal `#1E6B5C`, accent wash `#DDEFE9`, ring mint `#7BE3C6`, danger `#A12A1E`. Dark: background `#0D1115`, card `#161C22`, text `#F1EEE8`, muted `#A9B2BE`, accent `#7FD6BF`. All text pairs meet WCAG AA, body text aims for AAA.
- Type: Atkinson Hyperlegible Next. Body 18–19px, line height 1.5; headings 28–34px, weight 700; captions in Whisper mode 22–26px.
- Shape: 20px card radius, 999px pill buttons, 56px minimum touch targets, primary actions at the bottom of the screen.
- Motion: 180–260ms ease-out fades and slides; the ring "breathes" in once and settles. `prefers-reduced-motion` turns motion off.
- Copy: short, kind, second person. "Not someone you've added." "Getting ready on your phone…"

## Components

### App shell and navigation
Hash routes (`#/`, `#/enrol`, `#/whisper`, `#/person/:id`, `#/settings`, `#/privacy`), a bottom bar with People, Whisper and Settings, theme handling and toasts.
PRD ref: `prd.md > Screens and Layout`.

### Welcome and privacy
`Welcome` (first run) and `Privacy` (always reachable) pages with the privacy promise and honest limits.
PRD ref: `prd.md > Features and Behavior > Privacy and consent`, `prd.md > States and Boundaries`.

### Face engine
`src/lib/faceEngine.ts`: loads models once (WebGL backend, CPU fallback), `describe(image)` for enrolment (exactly one face, returns descriptor and a thumbnail), `detectAll(video)` for Whisper mode (boxes plus descriptors).
PRD ref: `prd.md > Features and Behavior > Enrolling a person`, `prd.md > Features and Behavior > Whisper mode`.

### Matcher
`src/lib/matcher.ts`: nearest-person search by Euclidean distance with a threshold (Careful 0.45, Balanced 0.52) and an ambiguity margin; a `Tracker` that needs 3 matching frames out of the last 4 before confirming, and a per-person cool-down. Pure functions, unit tested.
PRD ref: `prd.md > Features and Behavior > Whisper mode`.

### Vault (encrypted storage)
`src/lib/vault.ts`: IndexedDB stores `people` (encrypted blobs) and `keys` (one non-extractable AES-GCM key). `listPeople`, `savePerson`, `deletePerson`, `wipe`. Settings live in `localStorage` (no personal data).
PRD ref: `prd.md > Features and Behavior > Privacy and consent`, `prd.md > Features and Behavior > Managing people`.

### Whisper writer
`src/lib/whisper.ts`: rule-based note-to-whisper rewrite; `src/lib/onDeviceModel.ts`: optional built-in model path. Unit tested.
PRD ref: `prd.md > Features and Behavior > Turning a note into a whisper`.

### Voice and dictation
`src/lib/voice.ts` (speech synthesis with voice, volume, rate; optional soft chime) and `src/lib/dictation.ts` (speech recognition wrapper with on-device processing requested where supported).
PRD ref: `prd.md > Features and Behavior > Whisper mode`, `prd.md > Features and Behavior > Enrolling a person`.

### Enrol flow
`src/screens/Enrol.tsx` with four steps and a progress bar.
PRD ref: `prd.md > The Core Journey` steps 3–6.

### Whisper mode
`src/screens/WhisperMode.tsx`: camera view, `Overlay` canvas for rings and labels, caption card, controls, privacy badge, models-loading and camera-blocked states.
PRD ref: `prd.md > Features and Behavior > Whisper mode`.

### People and person editing
`src/screens/Home.tsx`, `src/screens/Person.tsx`.
PRD ref: `prd.md > Features and Behavior > Managing people`.

### Settings
`src/screens/Settings.tsx`.
PRD ref: `prd.md > Features and Behavior > Settings`.

### Demo mode
`src/lib/demo.ts`: loads sample people from `public/demo/faces/` (AI-generated faces, public domain, credited) by computing their fingerprints on the device; `src/lib/demoCamera.ts`: a canvas animation of the sample faces plus one not-added face, exposed as a camera stream.
PRD ref: `prd.md > Features and Behavior > Demo with sample people`.

### Offline cache
`public/sw.js`: a small service worker that caches the app shell and model files after first load.
PRD ref: `prd.md > Features and Behavior > Privacy and consent` (works offline after first load).

## Data Model
```ts
type Person = {
  id: string;            // random UUID
  name: string;
  note: string;          // what the user said or typed
  whisper: string;       // the line that is spoken
  whisperSource: 'rules' | 'on-device-model' | 'edited';
  cues: { clothes?: string; hair?: string; glasses?: string; other?: string };
  descriptors: number[][]; // 3–5 face fingerprints, 128 numbers each
  thumb: string;         // small JPEG data URL, on device only
  consentAt: string;     // ISO time the consent tick was given
  createdAt: string; updatedAt: string;
  sample?: boolean;      // true for synthetic demo people
};
```
- IndexedDB `face-whisper` → store `people`: `{ id, iv, data }` where `data` is the AES-GCM encrypted JSON of a `Person`. Store `keys`: `{ id: 'main', key: CryptoKey }`, non-extractable.
- `localStorage` `fw.settings`: theme, voice name, volume, rate, repeat interval, strictness, chime, welcome seen. No personal data.
- Leaving and returning: everything reloads from IndexedDB. Clearing site data loses it (stated on the privacy page).

## File Structure
```
face-whisper/
├── index.html              # app entry, meta tags, manifest link
├── run.sh                  # one command: install, build, serve; `fake-camera` mode
├── package.json
├── vite.config.ts
├── playwright.config.ts
├── public/
│   ├── models/             # face-api weights, copied from node_modules (not committed)
│   ├── demo/faces/         # synthetic sample faces + CREDITS.md
│   ├── sw.js               # offline cache
│   ├── manifest.webmanifest
│   └── icon.svg
├── scripts/
│   ├── copy-models.mjs     # copies model weights into public/models
│   ├── make-fake-camera.sh # builds y4m clips from the synthetic faces with ffmpeg
│   └── fake-camera.sh      # launches Chromium with the fake camera
├── src/
│   ├── main.tsx, App.tsx   # entry and shell
│   ├── styles/             # tokens.css, app.css
│   ├── lib/                # faceEngine, matcher, vault, whisper, voice, dictation, demo, demoCamera, settings, router
│   ├── components/         # BottomBar, Button, Sheet, Toggle, Field, PrivacyBadge, Overlay, Toast
│   └── screens/            # Welcome, Home, Enrol, WhisperMode, Person, Settings, Privacy
├── tests/
│   ├── unit/               # whisper, matcher, vault
│   └── e2e/                # Playwright: enrol, recognise, unknown, delete-all; demo recording
├── docs/shots/             # screenshots and demo video from Playwright
├── devpost/                # Devpost Learn planning docs (scope, prd, spec, checklist, app map)
├── DEMO.md                 # 2-minute click path and narration
└── README.md
```

## External Services and Dependencies
- **None at run time.** No API, no server, no key.
- Browser dictation may use the browser maker's speech service (for example Chrome sends audio to Google unless on-device recognition is available). The app requests on-device processing where the browser supports it, and the privacy page says this plainly. Typing avoids it.
- Model weights and fonts are bundled; nothing is fetched from a CDN.

## Important Failure Modes
- **Camera blocked or unavailable** → calm explanation with how to allow it, retry, and the demo camera.
- **WebGL unavailable or models slow** → CPU backend; "Getting ready…" progress; detection runs less often.
- **Wrong or uncertain match** → strict threshold plus margin plus 3-of-4-frame streak; ambiguous faces stay unknown; limits shown on screen.
- **No speech voices** → captions and the chime still work; settings explain.

## What Was Simplified and Why
- **Browser voice** instead of a generated cloud voice — needs no key and keeps whisper text on the device. The fuller version would add a key-holding proxy.
- **Rule-based whisper** by default instead of a cloud LLM — the note is short and formulaic; rules are fast, private and predictable. An on-device model is used only if the browser already has one.
- **One thumbnail per person** instead of keeping enrolment photos — fingerprints are what matching needs; fewer stored images, less to leak.
- **Local run plus Playwright video** instead of a hosted deployment — Harsh asked to keep everything local for now.

## Decisions and Open Issues
- On-device face matching with face-api (brief). Tradeoff: accuracy is below server-grade models, so thresholds are strict and limits are shown.
- Encrypted IndexedDB vault with a non-extractable key (brief said "encrypted if cheap"; Web Crypto makes it cheap). Tradeoff: protects against casual inspection of the browser's files, not against someone who controls the unlocked phone; the privacy page says so.
- **Recommendation (accepted):** thresholds Careful 0.45 / Balanced 0.52 (default Careful), 3-of-4 streak, 45 s repeat.
- **Uncertainty to check during the build:** does the descriptor distance separate the synthetic sample faces cleanly at 0.45 under the fake camera's motion and compression? Evidence: the Playwright run logs best and second-best distances, and the unknown face must stay unknown.
- From `prd.md > Open Questions`: dictation availability varies by browser; typing fallback built in.
