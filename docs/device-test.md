# Device test

Everything so far was tested in headless Chromium with a fake camera playing AI-generated faces (WebAssembly backend, about 0.1 s a frame on a 2-core ARM server). None of that proves it on a phone. This page is the checklist for a real phone, with space for the results. **Results below are blank until someone runs them on a device.**

## Set-up

- Open the app over HTTPS (the camera needs a secure page): the deployed address, or a tunnel to `./run.sh`.
- Use AI-generated faces from `public/demo/faces/` shown full screen on a laptop, or a friend who has agreed.
- Note the phone, OS version and browser for each run.

## Checks

| # | Check | How | Expected | Result (phone, browser, date) |
|---|---|---|---|---|
| 1 | Camera opens | Add someone, step 4 | Live preview with the oval guide; a plain message and a way to try again if permission is denied | |
| 2 | Face found on a laptop screen | Point at `sam.jpg` full screen, arm's length, laptop brightness up | Shutter enabled, a photo accepted; tilt the phone slightly if glare stops it | |
| 3 | Light check | Same, in a dim room | A light tip, judged on the oval where the face goes, not the whole frame | |
| 4 | Confident whisper | Whisper mode on the same face | Halo and caption after about a second of steady view; the line spoken in the earbud | |
| 5 | Maybe | Show the face at an angle or partly covered | Dotted ring, "Could be Sam?", nothing spoken | |
| 6 | No match | Show `stranger.jpg` | Faint outline, "No match", nothing spoken | |
| 7 | Earbud check | Fresh start, tour screen 3, Check your earbud | The test line in the earbud; "Yes" lets whispers be spoken, "Not yet" keeps a buzz and the caption | |
| 8 | Voice works offline | Settings, Voice: is it marked "on this phone"? Then airplane mode and Listen | Speaks with no network. If Settings says "This voice needs the internet", pick a voice on the phone; otherwise Halo shows the name instead of speaking | |
| 9 | App works offline | Open once online, then airplane mode, reload, demo camera | People list loads, sample people recognised | |
| 10 | Buzz | Settings, output Buzz | A short vibration on a confident match (Android; iPhone browsers don't vibrate) | |
| 11 | Install | Add to Home Screen | Opens full screen with the Halo icon | |
| 12 | Speed | Whisper mode with one face | Smooth preview; note roughly how long until the halo settles | |
| 13 | Delete everything | Settings | Back to the tour, people gone | |

## What we know so far

- Headless Chromium refuses a GPU context for TensorFlow.js, so tests use the WebAssembly backend; phones with WebGL should be faster.
- Browsers differ in which speech voices work offline. Halo prefers a voice marked as local, warns in Settings when the chosen voice needs the internet, and falls back to the caption and a buzz.
- iPhone browsers (all WebKit) don't support vibration; buzz mode shows the caption only there.
- Dictation is optional and labelled, because browser speech recognition may send audio to the browser maker.
