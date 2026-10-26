---
doc: prd
status: approved
---

# Halo: Product Requirements

A phone web app for people with face blindness: add people you know with their agreement, then hear a quiet reminder of who they are and how you know them when your camera is sure it's them. Everything stays on the phone.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

> **How this was made.** Written by an AI coding agent running the Devpost Learn `3-prd` skill, from Harsh's brief and decisions. Items marked **Agent recommendation** were proposed by the agent and accepted by Harsh through his coordinator.
>
> **Harsh's own notes (to fill in):** _[anything you would change after trying it]_

## The Core Journey
Develops `scope.md > The Core Loop`.

1. **Arrive.** A three-part tour: who it's for (with a real quote), the three steps, and the promise. An earbud check: "Did you hear it in your earbud?" Yes turns spoken whispers on; until then Halo buzzes and shows the name.
2. **Your people.** Empty at first, with **Add someone** and **Try with sample people** (AI-generated faces, clearly labelled).
3. **Add someone, step 1:** their name, and whether they are a child (children only ever get "Could be …?"). At most 50 people, 5 new a day. Or **say it all at once**: one spoken sentence fills the name, note, cues and where you met, for checking.
4. **Step 2:** a typed note (dictation is optional and labelled: the browser may send the audio to its maker). The line is written on the phone and can be heard in short, warm or full style.
5. **Step 3, their yes:** "Hand the phone to Sam." Sam reads the exact line, ticks "I'm Sam, and I agree" and taps **I agree**. If Sam isn't there, a link lets them answer on their own phone; the answer comes back in a link. Nothing is sent to a server.
6. **Step 4:** three to five photos with an oval guide, tips and a light check on the face area. A shot that looks like someone else is refused.
7. **Step 5:** optional cue notes (clothes, hair, glasses, voice) and where you met, typed or dictated. A look-alike warning if Sam is close to someone already added. Saved: "Sam is added", with **Try Whisper mode**.
8. **Whisper mode.** Full-screen camera, "Recognised on this phone only". A face the app is sure about (one face, at least a second and five frames, one facing the camera, clearly closer to one person than any other) gets a solid light halo, the caption and the spoken line. Not sure: a dotted ring, "Could be Raj? Check: green parka", no speech. Anyone else: "No match". "Who was that?" lists the last five.
9. **Today's list:** pick who you'll see, then read or hear their lines before you walk in. They are marked "On today's list" in Whisper mode. **Event mode** makes Whisper mode look for them only.
10. **Pocket mode:** from Whisper mode, wear the phone at chest height, camera out; the screen goes dark and stays awake, whispers go to the earbud, or buzz codes without one.
11. **Practice:** name people from their cues (or their photo, if that helps you); a gentle spaced schedule and "days you practised this week", never a streak.
12. **Settings and privacy:** output mode, voice (with an offline-voice check), volume, speed, chime, buzz, strictness, repeat interval, pause, quiet hours, pocket mode's buzz codes, a helper link, bigger text, higher contrast, theme, Enhanced mode, backups, Delete everything, and Privacy with the six honest limits and the ledger.
13. **Halo in 60 seconds:** from the first tour screen, the landing page or `#/try`, a guided minute with the sample people and the demo camera, no camera or tour needed.

Success: the user hears the right person's line within a couple of seconds of a steady view, and never hears a name for someone they didn't add.

## Screens and Layout
Tour, People, Add someone (five steps), Whisper mode (with pocket mode and the 60-second guide), Person, Today, Practice, Settings, Backups, Privacy, a received consent answer, a received helper card, plus the separate consent page the other person opens, the helper page and the landing page at `/` (the app lives at `/app/`). Navigation: a bottom tab bar with People, Today, a lit **Whisper** button in the middle, Practice and Settings.

## Look and Feel
From Harsh's brief ("beautiful and calm, large type, high contrast, accessible, one-handed") and the Hallmark skill he asked for: the Ribbon theme's structure in a palette from Ajrakh block-printed cotton (undyed cotton, iron black, indigo, madder), Instrument Sans for headings and names, Atkinson Hyperlegible Next for reading (designed for low-vision readers), machined pill controls and faders, 52px controls and 48px icon buttons, light and dark modes, bigger-text and higher-contrast modes, reduced motion respected. The halo, a resist-white ring on the iron-black night, is the one memorable thing; its three states differ by line (solid, dotted, faint dash) and by label, not only by colour. Details: `docs/design.md`.

## Features and Behavior

### Consent
Develops `scope.md > The Unique Kernel`.
- The person being added reads their line and agrees on the phone, or answers by link on their own phone; the owner can also record "They already said yes". The method and date are kept; after a year the person is marked "Ask again".
  - [x] Continue is disabled until there is a name; **I agree** stays disabled until the person ticks the box with their name.
  - [x] A link round trip adds the person with "Said yes by link" and posts nothing.

### Recognising, carefully
Develops `scope.md > What "Working" Looks Like`.
- Three states per tracked face: confident (speaks), maybe (asks, silent), no match (silent). Children and look-alikes are held at maybe.
  - [x] A sample person is spoken only after a steady second; the face that was never added is "No match" and never named.
  - [x] When a different face replaces the person in the same spot, the old name is dropped at once.

### Hearing it
- The phone's own voice in the chosen style; a stored natural voice when Enhanced mode made one; nothing aloud until the earbud check (a buzz and the caption instead); chime, buzz or silent modes.
  - [x] Default mode makes no network request at all.

### Preparing and practising
- Today's list and Practice as described in the journey. Each person can carry where you met, shown under the whisper and in today's list.
  - [x] A list of three people shows their lines and cues and can be played in order.
- **Event mode:** with "only look for these people" on, Whisper mode compares faces with today's list alone; anyone else, even people added, is "No match".
  - [x] With only Maya on the list, the demo camera names Maya and nobody else over a full cycle.

### Hands-free: pocket mode
- Answers "I'm not going to go around pointing my phone at everyone": the phone hangs at chest height with the camera out. The screen goes near-black and is kept awake (Wake Lock API); whispers go to the earbud; without the earbud check, buzz codes: two short (someone added), three short (on today's list), one long (could be). Double-tap or **Wake the screen** to return.
  - [x] Pocket mode asks for a wake lock, buzzes the known-person code and says nothing aloud before the earbud check.
- Limits stated in the app: iPhone browsers can't vibrate; a locked screen stops the camera.

### Saying less: quiet hours and never whisper
- Quiet hours (default 22:00 to 07:00, off): voice and chime become a buzz and the caption. A person marked **Never whisper** is shown on screen only, with no sound and no buzz.
  - [x] A never-whisper person is captioned and nothing is spoken or buzzed.

### Spoken enrolment
- "Say it all at once" on step 1: built-in rules split one sentence into the name, the note, cue notes and where you met; everything is shown for checking. Typing stays the default; dictation is labelled.
  - [x] A spoken sentence fills the note, whisper, clothes, glasses and where-you-met fields.

### A helper
- A partner, parent or friend opens the helper page and prepares a card: name, how you know them, cues, where you met. It comes back as a link, text only, in the URL fragment. The card starts adding the person at the note; they still read their line and say yes, and photos are taken on the user's phone.
  - [x] The card round trip posts nothing and the person's own yes is still required.

### Halo in 60 seconds
- A guided minute with the sample people and the demo camera, before the tour and with no camera: two people recognised, one face never added, then a summary. Aloud only if the user turns it on.
  - [x] The try finishes with two people recognised and the never-added face seen.

### A real product: privacy written out, control, a lock
- **Privacy, terms and safety pages** in plain words, linked from the landing page and Settings, matching the code; a test fails if connections or routes drift from the privacy page.
  - [x] The privacy page's routes and `connect-src 'self'` match the code and the headers.
- **Your data:** everything stored, with counts; remove one person; export; delete everything; **Wipe now** in two taps.
  - [x] After Wipe now there is no database, cache, service worker or stored setting left.
- **Lock:** a passcode (salted hash only) or the phone's own lock through WebAuthn, auto-lock after idle or time away, never during Whisper mode. Worded as a lock screen, not extra encryption.
  - [x] The wrong passcode is refused and the right one opens Halo; the phone lock works with a virtual authenticator.
- **Wrong person?** reports stay on the phone and become suggestions: Careful, hold at "Could be", new photos.
- **Help:** camera and microphone recovery, light, distance, glasses and masks; camera and dictation errors link to it.
- **Languages:** Hindi and Gujarati for the main flow, flagged as machine-translated.
- **Battery:** about six reads a second, two with Battery saver, none while hidden.
- **Updates** wait for a Reload tap.

### Accessibility
- Screen readers, keyboard and reduced motion are supported throughout; details in `docs/design.md`.
  - [x] axe-core finds no serious or critical problems on any page or screen, light and dark.

### Backups
- A file locked with a passphrase (PBKDF2, AES-GCM). Restoring opens the file and lets you choose who comes back; nobody is added silently.

### Enhanced mode (optional)
- Off by default. A consent sheet lists exactly what leaves the phone: the line to voice or translate, and a typed name and note for the cloud writer if chosen. Never faces, photos or face fingerprints. Every request appears in the ledger.
  - [x] With Enhanced mode on, requests carry only text under 400 bytes and appear in the ledger.

### Demo with sample people
- Three AI-generated sample people and a demo camera that cycles through them and one face that was never added.

## States and Boundaries
- **First run:** the tour; nothing stored until "I understand".
- **No people:** empty states with one action each.
- **Camera blocked, missing or busy:** a plain explanation, a retry, and the demo camera.
- **Models loading:** "Getting ready on your phone…" with progress; cached for offline use.
- **No voice, or an online-only voice:** captions still show; Settings warns and suggests a voice "on this phone".
- **Dark, far or turned away:** a calm hint in Whisper mode, judged on the face.
- **Quiet hours, event mode, no earbud check yet:** a note under the status line in Whisper mode says so.
- **Screen locks in pocket mode:** Halo asks for a wake lock; where the browser refuses, pocket mode says the screen may lock and stop the camera.
- **Persistence:** people, notes, practice and today's list stay encrypted in this browser until deleted.
- **Limits:** the six honest limits on the landing page and the Privacy screen.

## Product Decisions
- Consent from the person being added, not just the owner (Harsh's brief; strengthened after the risk review).
- On-device only; works with no key and offline (Harsh's brief).
- Strangers are never stored or named; "No match", never "stranger" (Harsh's brief, wording from the risk review).
- Name: **Halo** (Harsh, by poll).
- Enhanced mode only as an opt-in, text-only extra (Harsh, by poll).
- Pocket mode, event mode, where you met, spoken enrolment, quiet hours and never whisper, a helper, Halo in 60 seconds and an accessibility pass (Harsh, second feature round).
- **Agent recommendation:** helper cards are text only. Photos or face fingerprints in a link would leave the phone through whatever app sends it, which breaks the promise, so photos are taken in person on the user's phone.
- **Agent recommendation:** the thresholds (confident under 0.42 with a 0.08 lead, maybe under 0.50), one second and five frames, 45 seconds before repeating, 50 people and 5 a day.

## What We're Building
Everything above: tour, consent-first enrolment (typed or spoken), three-state Whisper mode with pocket mode, people with where you met and never whisper, Today with event mode, Practice, settings with quiet hours, backups, privacy ledger, optional Enhanced mode, landing page, consent page, helper page, demo mode and Halo in 60 seconds.

## Deferred From the POC
- Per-person thresholds and photo refresh reminders.
- Smart-glasses camera and audio.
- Search by place or cue, and an automatic "last seen" (Halo only keeps where you met as you typed it).
- A reviewed translation of every screen, and more languages.
- A real-world measurement of battery drain on phones.

## Possible Later Enhancements
- A "Show this" card explaining face blindness to someone.
- Studio voices for the sample people, made at build time.

## Non-Goals
- Identifying strangers or anyone who didn't agree.
- Server or cloud storage of faces.
- Security, access or safety decisions.

## Open Questions
- Real-world accuracy with people who have face blindness and their friends (`docs/accuracy.md`).
- Which phones offer an offline voice in each language (`docs/device-test.md`).
