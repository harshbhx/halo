# Credits and third-party material

Halo's own code is MIT licensed ([LICENSE](LICENSE)). It builds on the work below. Versions are the ones in `package-lock.json` at the time of writing.

## Pre-existing work used (disclosed for the hackathon rules)

| What | Used for | Licence |
|---|---|---|
| [Devpost Learn skill pack](https://github.com/challengepost/learn-ai-basics) (`1-start` to `6-ship`) | Planning documents and the build process | MIT |
| [Hallmark](https://github.com/Nutlope/hallmark) design skill, installed in this project only (`.claude/skills/hallmark`) | The Ribbon theme, scaffolded `tokens.css` and `base.css`, the `sloplint` checks, review prompts | MIT |
| AI coding agent | Wrote the planning documents and code from Harsh's brief and decisions | n/a |

## Faces

Every face in the app, the demo mode, the fake-camera clips, the screenshots and the videos is an **AI-generated image of a person who does not exist**, taken from Wikimedia Commons where each is marked public domain. Sources per file: [`public/demo/faces/CREDITS.md`](public/demo/faces/CREDITS.md). No photo of a real person is used anywhere.

## Code and models in the app

| Package | Used for | Licence |
|---|---|---|
| [@vladmandic/face-api](https://github.com/vladmandic/face-api) 1.7.15 | Face detection, landmarks, face fingerprints (archived February 2025) | MIT |
| Model weights (TinyFaceDetector, 68-point tiny landmarks, FaceRecognitionNet), originally from [face-api.js](https://github.com/justadudewhohacks/face-api.js) by Vincent Mühler | The face engine, served from `public/models/` | MIT |
| [TensorFlow.js](https://github.com/tensorflow/tfjs) 4.22 (bundled in face-api) and `@tensorflow/tfjs-backend-wasm` | Running the models on WebGL, WebAssembly or CPU | Apache 2.0 |
| [React](https://react.dev) 19 | The app's interface | MIT |
| [idb](https://github.com/jakearchibald/idb) 8 | IndexedDB access for the encrypted vault | ISC |
| [lucide-react](https://lucide.dev) | Icons | ISC |
| [Instrument Sans](https://fontsource.org/fonts/instrument-sans) via @fontsource | Headings and names | SIL Open Font Licence 1.1 |
| [Atkinson Hyperlegible Next](https://fontsource.org/fonts/atkinson-hyperlegible-next), Braille Institute, via @fontsource | Body text, designed for low-vision readers | SIL Open Font Licence 1.1 |

The app icon and the halo mark are drawn for this project.

## Build and test tools

[Vite](https://vite.dev) (MIT), [TypeScript](https://www.typescriptlang.org) (Apache 2.0), [Vitest](https://vitest.dev) (MIT), [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) (Apache 2.0), [Playwright](https://playwright.dev) (Apache 2.0), [puppeteer-core](https://pptr.dev) for Hallmark's rendered checks (Apache 2.0), [axe-core](https://github.com/dequelabs/axe-core) with @axe-core/playwright for the accessibility tests (MPL 2.0), [ffmpeg](https://ffmpeg.org) for the fake-camera clips and mp4 conversion (LGPL/GPL, used as a tool, not shipped).

## Optional Enhanced mode (not deployed from this repository)

Runs on [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) under Cloudflare's terms. Models: `@cf/myshell-ai/melotts` (MeloTTS, MIT), `@cf/ai4bharat/indictrans2-en-indic-1B` (IndicTrans2, MIT), `@cf/meta/m2m100-1.2b` (M2M100, MIT), `@cf/meta/llama-3.2-3b-instruct` (Llama 3.2 Community Licence), `@cf/openai/whisper-large-v3-turbo` (Whisper, MIT).

## Words and numbers

- Quotes are from public posts on [r/prosopagnosia](https://www.reddit.com/r/prosopagnosia/), shown word for word with the username and a link where one is known.
- Prevalence: [Kennerknecht et al. 2006](https://doi.org/10.1002/ajmg.a.31343), [DeGutis et al. 2022](https://bu.edu/ballab/pubs/DeGutis2022_Ax2.pdf). Faces people know: [Jenkins, Dowsett and Burton 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6191703). Bias in face recognition: [NIST IR 8280](https://nvlpubs.nist.gov/nistpubs/ir/2019/NIST.IR.8280.pdf).
- Prior art named on the landing page and in the README: OrCam MyEye, Envision's Teach a Face, NameVault. Their names are used only to describe what exists; no logos or material from them are used.
