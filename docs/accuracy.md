# How accurate is Halo?

Short answer: **we don't know yet for real people in real rooms.** This page says what has been measured, what it shows and what it doesn't, and how to test it properly.

## What was measured

`npm run accuracy` runs Halo's own face engine (face-api's TinyFaceDetector, 68-point tiny landmarks and FaceRecognitionNet, in Chromium with the WebAssembly backend) on the five AI-generated sample faces in `public/demo/faces/`. Each face has only one photo, so the script makes ten altered copies of each (closer, tilted 6° and -8°, dim light, bright light, soft focus, warm cast, smaller and off-centre, mirrored), uses three as the "enrolment photos" and the other seven as probes. The numbers are written to [`eval/accuracy-synthetic.json`](../eval/accuracy-synthetic.json).

Result of the run on 26 Oct 2026:

| | Pairs | Distance (lower = more alike) |
|---|---|---|
| Same person, altered copy vs its enrolment photos | 32 | 0.05 to 0.21, median 0.13 |
| Different people | 128 | 0.70 at the closest, median 0.85 |
| Copies where no face was found | 4 of 50 | a -8° tilt (twice), a small off-centre face, one close-up |

At the Careful setting Halo is only *confident* below 0.42 with a 0.08 lead over the next person, and suggests "Could be …?" below 0.50. On this set every readable same-person copy was under 0.42 and no different-person pair came under 0.50.

The live end-to-end test (`tests/e2e/demo-mode.spec.ts`) shows the same separation through the camera path: confident frames 0.11 to 0.22, the face that was never added 0.79 to 0.82 from everyone.

## What this does not prove

- **Five faces is not a population.** It says nothing about error rates across thousands of people, and nothing about the people any one user knows.
- **Altered copies are not new photos.** Real changes (another day's lighting, a new haircut or glasses, a different expression, age, a profile view, a mask) are much harder than brightness and tilt. Real same-person distances will be larger.
- **AI-generated faces are not real faces.** They are cleaner and more frontal than camera frames.
- **Bias is untested.** Open face models make more mistakes for darker-skinned and East Asian faces, women, children and older people ([NIST IR 8280](https://nvlpubs.nist.gov/nistpubs/ir/2019/NIST.IR.8280.pdf)); this exact model has no published bias study. Relatives and twins are a known weak spot ([NIST twins demonstration](https://pages.nist.gov/frvt/html/frvt_twins_demonstration.html)).
- **Nobody with face blindness has used it yet.**

That is why Halo speaks only when it is confident for at least a second and five frames, including a frontal one, stays at "Could be …?" for children and close calls, and says "No match" rather than "stranger".

## How to test it properly

1. **Real-world session (planned, not done):** 10 consenting adults across skin tones, ages and genders, with and without glasses, plus a pair of siblings if possible; each enrolled on one phone; then 20 encounters per person on another day, indoors, outdoors and in evening light. Record for each encounter: confident right, confident wrong, maybe, silent. Publish the counts as they come out, including the wrong ones.
2. **Your own folder of faces:** `EVAL_DIR=/path/to/faces npm run accuracy` reads any folder laid out as `<person>/<photo>.jpg` (two to six photos each) and writes `eval/accuracy-custom.json`. Use only photos you have permission to use. Public research sets such as LFW are skewed (about 77% male and 83% White, per [Datasheets for Datasets](https://arxiv.org/pdf/1803.09010)), so prefer a balanced set.
3. **Thresholds per person** (a planned improvement): measure each person's own spread at enrolment and tighten the limit for people with look-alikes.

## Speed and battery

`npm run perf` opens Whisper mode on the demo camera and measures, from the app's own counters, how many frames it reads a second and how much of each second it spends reading them. Measured on 26 Oct 2026 in headless Chromium on the build machine (a 2-core ARM server, WebAssembly backend, no GPU), written to [`eval/performance.json`](../eval/performance.json):

| Setting | Frames read a second | Time per frame | Share of each second spent reading |
|---|---|---|---|
| Normal | 6.6 | 85 ms | 56% |
| Battery saver | 2.0 | 84 ms | 17% |
| Page hidden (another app in front, or the screen off) | 0 | none | 0% |

- **Normal** reads at most about six frames a second (a gap of 150 ms less the time the last read took), which is enough to follow someone walking up.
- **Battery saver** (Settings) waits about half a second between reads: about a third of the work, a little slower to notice someone.
- **Hidden:** when the page is hidden, Whisper mode reads nothing and checks again every half second; phones also stop the camera when the screen locks, and Halo restarts it on return.

What these numbers don't say: a phone with WebGL is usually faster per frame than this server; heat, battery drain in milliamps and the camera's own cost weren't measured. The ratio between the settings is the useful part.

## Known limitation of the engine

[@vladmandic/face-api](https://github.com/vladmandic/face-api) was archived in February 2025. It still works, and its models are bundled here, but it gets no fixes. A move to a maintained engine is planned after the hackathon.
