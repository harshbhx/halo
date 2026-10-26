---
doc: prd
status: approved
---

# Face Whisper — Product Requirements

A phone web app for people with face blindness: enrol people you know with their consent, then hear a quiet spoken reminder of who they are and how you know them when your camera sees them. Everything stays on the phone.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

> Process note: answers come from Harsh's written brief (screens, privacy rules, quality bar). Where the brief was silent, the choice is marked **Assumption** below.

## The Core Journey
Develops `scope.md > The Core Loop` and `scope.md > What "Working" Looks Like`.

1. **Arrive.** The first screen explains the promise in plain words: who it is for, that faces never leave this phone, that you only add people who agreed, and the honest limits. One button: "I understand, let's start".
2. **Home.** An empty people list says "No one added yet" and offers two actions: **Add someone** and **Try with sample people** (synthetic faces, clearly labelled).
3. **Enrol, step 1: Consent.** Type their name. Tick "They agreed to be added to my phone". Continue stays disabled until both are done.
4. **Enrol, step 2: Photos.** The camera opens with an oval guide. Each tap of the shutter takes a shot; the app checks it contains exactly one clear face and shows a small thumbnail. Tips change between shots ("now turn a little left"). After 3 good shots, **Next** unlocks; up to 5 allowed.
5. **Enrol, step 3: Note.** Hold the microphone button and speak ("This is Raj, my neighbour, had knee surgery last month"), or type. A whisper preview appears under the note ("Raj, your neighbour. Knee surgery last month.") and can be edited or played aloud.
6. **Enrol, step 4: Cues (optional).** Short notes on how to spot them: usual clothes, hair, glasses, voice. Save.
7. **Whisper mode.** One large button at the bottom of Home. Full-screen camera with a badge "Recognised on this phone only". When an enrolled face is held in view for a moment, a soft ring settles around it with their name, the whisper is spoken quietly, and a caption card shows the whisper and their cue notes. A face not enrolled gets only a faint outline and "Not someone you've added".
8. **Manage.** People list rows show photo, name and whisper. Tap to edit any field, add photos, play the whisper, or delete the person.
9. **Settings.** Voice, volume, speaking rate, a test button, how often to repeat a whisper, recognition strictness, theme, privacy and limits, and **Delete everything**.

Success: the user hears the right person's whisper within a couple of seconds of pointing the camera, and never hears a name for someone they did not add.

## Screens and Layout
- **Welcome** (first run only, reachable later from Settings > Privacy and limits).
- **Home / People**: title, short status line, list of people, "Add someone" button.
- **Enrol** (4 steps with a progress indicator and a Back control).
- **Whisper mode** (full screen, camera fills the screen, controls at the bottom within thumb reach).
- **Person** (edit).
- **Settings**.
- **Privacy and limits** (plain-language page).

Navigation: a bottom bar with three items, People, **Whisper** (the large centre button) and Settings, so everything important is reachable with one thumb. Enrol and Person open as full screens with a clear Back.

## Look and Feel
From the brief: mobile-first, beautiful and calm, large type, high contrast, accessible, one-handed.
- Calm, warm and quiet: a soft paper-like background in light mode, deep ink in dark mode, one gentle teal accent; the ring around a recognised face is a soft mint glow, never a red "target" box.
- Large, highly legible type (body 18px or more, headings 28px or more). **Assumption:** Atkinson Hyperlegible, a typeface designed by the Braille Institute for low-vision readers, self-hosted so no font request leaves the phone.
- Rounded cards, generous spacing, smooth but short transitions; reduced motion respected.
- Plain, kind language. No surveillance imagery, no crosshairs, no "scanning…" alarm style.

## Features and Behavior

### Privacy and consent
Develops `scope.md > The Unique Kernel`.
- Face detection, face descriptors and matching run on the phone. Photos, descriptors and notes are stored only in this browser, encrypted at rest.
- Nothing about faces is ever sent anywhere. The app works with no account and no API key.
- Enrolment cannot start without the consent tick.
- Faces seen in Whisper mode that do not match are discarded immediately and never stored.
  - [ ] With the network disconnected after first load, enrolment and Whisper mode still work.
  - [ ] Continue on the consent step stays disabled until a name is typed and the consent box is ticked.
  - [ ] The "Recognised on this phone only" badge is visible whenever the camera is on.

### Enrolling a person
Develops `scope.md > The Core Loop` step 1.
- 3 to 5 photos; each must contain exactly one face of usable size, otherwise a gentle message explains why ("We couldn't see a face. Try more light.").
- Note by voice (browser dictation where available) or typing. If dictation is not available, the microphone button explains that and the text box works.
- Cue notes are optional free text in labelled fields: clothes, hair, glasses or accessories, voice or other.
  - [ ] Three shots of the same face produce three thumbnails and unlock Next.
  - [ ] A shot with no face shows a friendly error and is not kept.
  - [ ] Saving returns to Home and the new person appears with name and whisper.

### Turning a note into a whisper
Develops `scope.md > The Unique Kernel`.
- The note is rewritten into one short line in second person: "This is Raj, my neighbour, had knee surgery last month" becomes "Raj, your neighbour. Knee surgery last month."
- Works without any key (rule-based). If the browser has a built-in on-device language model, it may be used instead, and the app says which one made the line.
- The whisper is always editable.
  - [ ] Typing the Raj note shows the Raj whisper preview without network access.
  - [ ] Editing the whisper by hand keeps the hand-edited text.

### Whisper mode
Develops `scope.md > The Core Loop` step 3 and `scope.md > What "Working" Looks Like`.
- Live camera (back camera by default, switchable). The face must match steadily across a few frames before anything is spoken, to avoid flicker and wrong names.
- On a match: soft ring with the name, the whisper is spoken at the chosen volume, the caption card shows whisper and cue notes. The same person is not repeated until the repeat interval passes (default 45 seconds) or the user taps the caption to hear it again.
- Unknown faces: faint outline, label "Not someone you've added", nothing spoken, nothing stored.
- Controls: pause or resume, mute, switch camera, close.
  - [ ] Pointing at an enrolled person shows their ring and caption and speaks the whisper within about two seconds.
  - [ ] Pointing at someone not enrolled never shows a name.
  - [ ] Mute stops speech while captions continue.

### Managing people
- List with photo, name and whisper; tap to edit; add more photos; play whisper; delete with confirmation.
  - [ ] Deleting a person removes them from the list and Whisper mode stops recognising them.

### Settings
- Voice (from the voices the device offers), volume, rate, test voice; repeat interval; strictness (Careful or Balanced); theme (system, light, dark); Privacy and limits; Load sample people; **Delete everything**.
  - [ ] Delete everything asks once for confirmation, then removes all people, photos, notes, settings and the encryption key, and returns to the Welcome screen.

### Demo with sample people
Develops `scope.md > The POC Boundary` (demo mode).
- "Try with sample people" adds three people whose photos are AI-generated faces of people who do not exist, each clearly marked "Sample" with a credit line.
- Whisper mode offers a **demo camera** when sample people exist: a looping feed of the sample faces plus one sample face that was not added, so a judge alone can see recognition and the "unknown stays unknown" rule.
  - [ ] With sample people loaded and the demo camera on, Whisper mode recognises the sample people and labels the extra face "Not someone you've added".

## States and Boundaries
- **First use** — Welcome screen; nothing stored until the user taps start (only the "seen welcome" flag).
- **No people yet** — Home shows the empty state; the Whisper button explains "Add someone first" or offers the demo.
- **Camera blocked or missing** — a calm screen explains how to allow the camera in the browser, with a retry button; the demo camera remains available.
- **Models loading** — first open of the camera shows "Getting ready on your phone…" with progress; after that the models are cached.
- **No speech voices** — captions still show; Settings explains that speech is unavailable in this browser.
- **Persistence** — people, notes, cues and settings persist in this browser until deleted. Clearing site data or using a private window loses them; the privacy screen says so.
- **Wrong match risk** — the limits are visible on the privacy screen and in a one-line footnote in Whisper mode: lighting, angles, glasses, twins and similar faces can fool it; never use it for security or safety decisions.

## Product Decisions
- Consent before any photo is taken — enrolment is for people who agreed (brief).
- On-device only; no face data leaves the phone (brief).
- Works fully without any key; rule-based whisper always available (brief).
- Unknown faces are never stored or named (brief).
- Cue notes captured because people with face blindness recognise others by clothes, hair and glasses (brief).
- Demo uses only synthetic faces, never real people's photos (brief).
- **Assumption:** default repeat interval 45 seconds and a steady match across several frames before speaking, to keep the whisper calm and rare rather than chatty.
- **Assumption:** the people list stores a small face thumbnail to make the list usable; it lives only in the encrypted on-device store.

## What We're Building
Welcome and privacy, Home with people list, 4-step enrolment (consent, photos, note, cues), note-to-whisper, Whisper mode with ring, caption and speech, person editing and deletion, settings with voice and delete everything, demo mode with synthetic sample faces and a demo camera.

## Deferred From the POC
- Generated (cloud) voice: needs a server to hold a key; browser speech is enough to prove the kernel.
- Export and import to a new phone: needs a careful encrypted file format.
- Multi-face priority (several enrolled people in one frame are each ringed, but only the closest is spoken).

## Possible Later Enhancements
- Smart-glasses camera and bone-conduction audio.
- Gentle haptic tap before a whisper.
- Per-person "last seen" memory, kept on device.

## Non-Goals
- Identifying strangers or anyone who did not agree: the product's ethics depend on it.
- Any server or cloud face storage: breaks the privacy promise.
- Security, access-control or safety decisions: face matching can be wrong.

## Open Questions
- Which phones expose dictation in the browser (Chrome Android and Safari iOS do; others fall back to typing). Can wait; the fallback is built in.
