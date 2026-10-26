# Face Whisper: 2-minute demo

Everything needed to make the demo video without a real person on camera. Every face that appears is an AI-generated image of someone who does not exist ([credits](public/demo/faces/CREDITS.md)).

## Fastest path: use the recorded walkthrough

```bash
./run.sh record
```

This builds the app and records the whole click path below in headless Chromium with a fake camera:

- `docs/shots/walkthrough.mp4` (and `.webm`): 390 x 844 phone-sized, about 100 s, **no audio**
- `docs/shots/01-…20-*.png`: one screenshot per step (2x, for thumbnails and stills)
- `docs/shots/timeline.json`: when each step happens, to the second, for placing narration and the spoken whispers

Then, in an editor: put the phone-sized video on a calm background, add the narration below, and drop in the three spoken whispers at the times listed. The app speaks whispers with the browser's own voice; the headless recording has no speakers, so add them as audio (a soft, close, quiet voice, like someone leaning in). Optional: a short title card before and an end card after, to land at about 2:00.

## Live path: drive it yourself

```bash
./run.sh fake-camera          # Chromium whose camera plays "Sam" (AI-generated)
./run.sh fake-camera street   # Sam, then a stranger, then Sam again
```

Needs a display (on a server: `xvfb-run -s '-screen 0 1280x1000x24' ./run.sh fake-camera`). The browser profile is kept in `.demo-profile/`; delete it to start fresh. Any normal browser on `http://localhost:4173` works too, with a real webcam and a friend who agreed.

## The click path (matches the recording)

| Time | On screen | Do |
|---|---|---|
| 0:00 | **Welcome**: "Know who's in front of you.", the user quote, three promises | Scroll slowly, tap **I understand, let's start** |
| 0:07 | **People you know**, empty state | Tap **Add someone** |
| 0:09 | **Step 1 of 4**: name and consent | Type `Sam`, tick **Sam agreed to be added**, **Continue** |
| 0:15 | **Step 2 of 4**: camera with oval guide and tips | Tap the shutter 3 times (thumbnails fill), **Continue** |
| 0:22 | **Step 3 of 4**: note | Type `This is Sam, my teammate from the hackathon, loves climbing`; the whisper preview becomes "Sam, your teammate from the hackathon. Loves climbing." **Continue** |
| 0:28 | **Step 4 of 4**: cues | `Green raincoat`, `Brown hair with a fringe`, **Save Sam** |
| 0:34 | People list with Sam | Tap the big **Whisper** button |
| 0:35 | **Whisper mode**: soft ring around Sam, "Sam" label, caption, "Recognised on this phone only" | Whisper 1 plays. Tap the caption: it plays again (0:42) |
| 0:49 | Settings | **Add sample people** (Maya, Arjun, Walter: AI-generated faces) |
| 0:53 | People list + "Try it without anyone else" card | **Open the demo camera** |
| 0:55 | Demo camera: Maya recognised | Whisper 2 plays |
| 1:01 | A stranger: faint dashed outline, "Not someone you've added", status "No one you've added", no caption | Nothing is spoken |
| 1:08 | Arjun recognised | Whisper 3 plays |
| 1:16 | Sam's page: "Agreed 26 Oct 2026", "3 face fingerprints", editable whisper | Scroll, back |
| 1:22 | Settings: voice, volume, speed, chime, Careful/Balanced | Tap **Dark** |
| 1:25 | Privacy and honest limits | Scroll, back |
| 1:32 | **Delete everything?** sheet | **Yes, delete everything** |
| 1:34 | Back to the Welcome screen, nothing left | End (1:37) |

Times are from `timeline.json` of one recording and can drift by a second or so between runs; re-read the file after recording.

## Spoken whispers (audio to add)

1. 0:35 and 0:42: "Sam, your teammate from the hackathon. Loves climbing."
2. 0:55: "Maya, your manager at work. Just back from parental leave."
3. 1:08: "Arjun, your neighbour from flat 4. Knee surgery last month."

Each is preceded in the app by a soft two-note chime (optional in the edit).

## Narration (draft for Harsh to put in his own words)

The Devpost `6-ship` skill asks that submission copy is the learner's own. This is a starting draft of what to say over each part; rewrite freely.

- **0:00 Problem.** "About two in every hundred people have face blindness. They can't recognise a face, even a colleague's or a neighbour's. One of them wrote: what we need is someone saying in our ears, yes, you know that person."
- **0:08 Promise.** "Face Whisper does that, on your phone, privately. Faces never leave the device, and you only add people who said yes."
- **0:12 Enrol.** "I add my teammate Sam. I confirm Sam agreed. Three photos. Then a short note, spoken or typed, and it becomes one quiet line. A few cues too, like a green raincoat, because many people with face blindness recognise others by those."
- **0:33 Whisper.** "Now Whisper mode. When Sam is steady in view, a soft ring appears and I hear, in my earbud..." *(whisper 1)*
- **0:49 Strangers.** "No friend nearby? The demo camera uses AI-generated sample people. Maya... *(whisper 2)* ...and someone I never added: nothing. No name, nothing stored. Strangers stay strangers." *(whisper 3 over Arjun)*
- **1:16 Control.** "Every person shows when they agreed. Everything is editable. The voice, speed and how sure it must be before it speaks are all adjustable."
- **1:25 Honesty.** "It's honest about its limits: light and angles matter, and it's never for security decisions. It runs in the browser with on-device face models, works offline, and needs no account and no API key."
- **1:32 Delete.** "And one tap deletes everything, including the encryption key."
- **1:35 Close.** "Face Whisper. Who's in front of you, whispered, on your phone only."

## Don'ts

- No real person's face or name on screen. Use the fake camera or the sample people.
- Keep the "Recognised on this phone only" badge and the "AI-generated" sample labels visible when they're on screen.
- Don't claim accuracy figures beyond what's measured: on these synthetic faces the same person scored 0.08 to 0.33 and the stranger 0.78 to 0.82 (lower is closer; the app needs under 0.45).
