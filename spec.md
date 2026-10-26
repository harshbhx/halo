---
doc: spec
status: approved
---

# Halo: Technical Spec

> **How this was made.** Written by an AI coding agent running the Devpost Learn `4-spec` skill, from Harsh's brief (on-device face matching with face-api, browser storage, browser speech, works with no key) and his later decisions (the name, optional text-only Enhanced mode on Cloudflare, the Hallmark design skill). Choices the brief left open are marked **Agent recommendation**.
>
> **Harsh's own notes (to fill in):** _[the technical part you'd explain to a friend in your own words]_

## How This Works, In Plain Language
Halo is a website that runs on the phone. Everything that touches a face happens inside the browser.

- **The face reader** is a small neural network (face-api) that finds faces in a camera frame and turns each into a *face fingerprint*: 128 numbers. Two photos of the same person give fingerprints that are close together.
- **Adding someone** means a note, their own "I agree", three to five photos turned into fingerprints, and optional cue notes. The photos are thrown away; one small picture is kept for the list.
- **The vault** is the browser's database on the phone, encrypted with a key the browser makes and refuses to export. "Delete everything" removes the data and the key.
- **The tracker** follows each face across frames and gives it one of three states: confident (spoken), maybe ("Could be Raj?", silent) or no match. A wrong name is worse than silence.
- **The voice** is the browser's own speech, or a natural voice clip made once in Enhanced mode and kept with the person.
- **Enhanced mode** (optional, off by default) is Halo's own server on the same address, which receives only text: the line to voice or translate, and a typed note if you ask it to write the line. It never receives faces.

Why this shape: it is the smallest design that keeps the privacy promise. There is no account and no face server to leak.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. Open `/app/` → `App` reads settings from `localStorage` (no personal data) → `Welcome` tour → earbud check sets `speakAllowed`.
2. **Add someone** → `Enrol`: name → note (`whisper.ts` rules, or an on-device model, or Enhanced mode's writer) → their yes (`consentMethod: 'in-person'`, or `consentLink.ts` for a link) → `PhotoStep` (`faceEngine.describe` per shot) → cues → `vault.savePerson` encrypts and stores → `say.enrich` adds a translation and a natural voice if Enhanced mode is on.
3. **Whisper** → `WhisperMode` opens the camera (or `demo.createDemoStream`) → each frame `faceEngine.detectAll` → `matcher.nearest` per face → `FaceTracker.update` gives each track a state → confident: `say.sayPerson` (clip, phone voice, buzz or caption) and `recent.remember`; maybe: a dotted ring and a question; no match: a faint outline. Fingerprints of faces in view are dropped right after the comparison.
4. **Delete everything** → `vault.wipeVault` deletes the database and key, settings reset, back to the tour.

## Stack
- **TypeScript 5.9, React 19, Vite 7**: a static multi-page site (`/`, `/app/`, `/consent/`). Docs: https://react.dev, https://vite.dev. **Agent recommendation.**
- **@vladmandic/face-api 1.7** (TinyFaceDetector, 68-point tiny landmarks, FaceRecognitionNet) with TensorFlow.js on WebGL, then WebAssembly, then CPU. Model weights and WebAssembly are served from the site itself. Note: the library was archived in February 2025; it still works, and a move is planned. Docs: https://github.com/vladmandic/face-api.
- **idb 8** and **Web Crypto (AES-GCM, PBKDF2)**. Docs: https://github.com/jakearchibald/idb, https://developer.mozilla.org/docs/Web/API/SubtleCrypto.
- **Web Speech API** for the voice and optional dictation. Docs: https://developer.mozilla.org/docs/Web/API/Web_Speech_API.
- **Fonts:** Instrument Sans and Atkinson Hyperlegible Next, self-hosted through @fontsource. **Icons:** lucide-react.
- **Design:** the Hallmark skill (project-level, `.claude/skills/hallmark`), Ribbon theme, swept with its `sloplint` (static and rendered) and two fresh-context reviews.
- **Enhanced mode:** one Cloudflare Worker (`worker/index.ts`) with Workers AI: `@cf/myshell-ai/melotts`, `@cf/ai4bharat/indictrans2-en-indic-1B`, `@cf/meta/m2m100-1.2b`, `@cf/meta/llama-3.2-3b-instruct`, `@cf/openai/whisper-large-v3-turbo`. Docs: https://developers.cloudflare.com/workers-ai/.
- **Tests:** Vitest (unit, including the Worker with Workers AI mocked) and Playwright with Chromium's fake camera playing an AI-generated face.

## Where It Runs and How Someone Tries It
- Any modern phone or desktop browser; the camera needs `https` or `localhost`. No API keys.
- **Run:** `./run.sh` builds and serves `dist/` with the production headers at http://localhost:4173 (landing) and http://localhost:4173/app/ (the app).
- **Without a person:** **Try with sample people** and the demo camera in the app; `./run.sh fake-camera` opens Chromium with a synthetic-face camera.
- **Evidence:** `npm run screens` (every screen, light and dark, phone and desktop), `npm run demo:record` (the walkthrough video), `npm run accuracy` (distances).
- **Deploy (Harsh, later):** `npm run build`, then `npx wrangler deploy` with `wrangler.jsonc` (Workers static assets at the domain root, single-page fallback, `/api/*` to the Worker, Workers AI binding). Not deployed from this repo.
- Submission needs a public repo and a video; both are Harsh's steps (`docs/submission-checklist.md`).

## Look and Feel
From `prd.md > Look and Feel`, built as Hallmark's Ribbon theme: dawn paper `oklch(98.2% 0.008 82)`, ink `oklch(18% 0.006 80)`, the night `oklch(13.2% 0.022 258)` for Whisper mode and dark mode, one amber accent `oklch(80% 0.12 72)` (the halo). Instrument Sans 400/500 for heads and names, Atkinson Hyperlegible Next 400/700 for reading, root size 18px (21px with Bigger text), a 1.2 type ratio, the 4px-based spacing scale, machined pills and faders, 420ms ease-out at most. Full system: `docs/design.md`; tokens: `src/styles/tokens.css`.

## Components

### App shell and navigation
Hash routes and a five-tab bar. `src/App.tsx`, `src/lib/router.ts`, `src/components/ui.tsx`. PRD ref: `prd.md > Screens and Layout`.

### Face engine
`src/lib/faceEngine.ts`: loads the models once, `describe` for enrolment (one clear face), `detectAll` with landmarks for Whisper mode, `frameBrightness` on the face area. PRD ref: `prd.md > Features and Behavior > Recognising, carefully`.

### Tracker and matcher
`src/lib/matcher.ts`: `nearest`, `FaceTracker` (per-face tracks by overlap, three states, a track that disagrees for two frames starts again, repeat interval), `STATE_LIMITS`. Unit tested in `tests/unit/tracker.test.ts`. PRD ref: same.

### Vault, stores and ledger
`src/lib/vault.ts` (encrypted people and meta records), `src/lib/stores.ts` (today's list, practice), `src/lib/ledger.ts` (what left the phone). PRD ref: `prd.md > Features and Behavior > Consent`, `> Backups`.

### Whisper writer and voice
`src/lib/whisper.ts` (rules), `src/lib/whisperStyle.ts` (short, warm, full), `src/lib/say.ts` (one path for speaking, enrichment), `src/lib/voice.ts` (speech, chimes, haptics, clips, offline-voice check). PRD ref: `prd.md > Features and Behavior > Hearing it`.

### Consent
Handoff in `src/screens/Enrol.tsx`; links in `src/lib/consentLink.ts`, `consent/` and `src/screens/ConsentReceived.tsx`. PRD ref: `prd.md > Features and Behavior > Consent`.

### Screens
`src/screens/`: Welcome, Home, Enrol, WhisperMode, Person, Today, Practice, Settings, Backup, Privacy, ConsentReceived.

### Enhanced mode
`src/lib/enhanced.ts` (the only client code that calls a server, only when on and online, every call to the ledger) and `worker/index.ts` (origin check, signed sessions, strict schemas, size caps, per-IP rate limit, daily ceiling, no logging). PRD ref: `prd.md > Features and Behavior > Enhanced mode (optional)`.

### Landing page
`index.html`, `landing/`: Hallmark Narrative Workflow shape, Counter hero with a real capture, the page speaks a whisper, the six honest limits.

## Data Model
```ts
type Person = {
  id; name; note; whisper; whisperSource: 'rules' | 'on-device-model' | 'enhanced' | 'edited';
  cues: { clothes?; hair?; glasses?; other? };
  descriptors: number[][];     // 3 to 8 face fingerprints
  thumb: string;               // small JPEG, on the phone only
  consentAt: string; consentMethod?: 'in-person' | 'link' | 'owner-confirmed';
  child?: boolean; sample?: boolean;
  voiceClip?: { text; audio };          // Enhanced mode, base64 MP3
  translated?: { lang; text };          // Enhanced mode, editable
  createdAt; updatedAt;
};
```
IndexedDB `face-whisper` (internal name kept from the first build): `people` and `meta` hold AES-GCM ciphertext; `keys` holds one non-extractable key. `meta` keeps today's list, practice cards, practice days and the ledger. `localStorage` keeps settings only.

## External Services and Dependencies
- **Default mode: none.** No network request carries user data; the CSP sets `connect-src 'self'` and `npm run build` fails if the build loads anything from another origin.
- **Enhanced mode:** Halo's own Worker on the same origin; Workers AI under Cloudflare's no-training, no-retention terms. Payloads and limits in `worker/README.md`.
- **Browser dictation** may send audio to the browser maker; typing is the default.

## Important Failure Modes
- **Wrong person** → three states, strict limits, track reset on a face swap, children and look-alikes held at maybe, the honest limits on screen.
- **Camera blocked or missing** → a plain explanation, retry, the demo camera.
- **No WebGL** → WebAssembly, then CPU.
- **No or online-only voice** → captions and a buzz; Settings points to an offline voice.
- **Enhanced mode down** → the phone's voice, the rules and English, as if it were off.

## What Was Simplified and Why
- **Browser voice by default** instead of generated voices: no key, nothing leaves the phone. Enhanced mode adds a natural voice for those who opt in.
- **Rules first** for writing whispers: predictable and offline.
- **Thumbnails, not photos**: fingerprints are what matching needs.
- **Synthetic accuracy check** instead of a real-world study: the study is planned (`docs/accuracy.md`).

## Decisions and Open Issues
- On-device matching with face-api (Harsh's brief); accuracy below server-grade models, so Halo is conservative and says so.
- **Agent recommendation:** the three-state thresholds and timings, the 50 and 5 limits, 45 seconds between repeats.
- **The uncertainty checked in the build:** do the distances separate people? On the synthetic set, same person 0.05 to 0.21 and different people 0.70 or more (`eval/accuracy-synthetic.json`). Real-world separation is still open.
- Open: real-world accuracy and bias, offline voices per language, the archived face library.
