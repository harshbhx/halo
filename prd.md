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
3. **Add someone, step 1:** their name, and whether they are a child (children only ever get "Could be …?"). At most 50 people, 5 new a day.
4. **Step 2:** a typed note (dictation is optional and labelled: the browser may send the audio to its maker). The line is written on the phone and can be heard in short, warm or full style.
5. **Step 3, their yes:** "Hand the phone to Sam." Sam reads the exact line, ticks "I'm Sam, and I agree" and taps **I agree**. If Sam isn't there, a link lets them answer on their own phone; the answer comes back in a link. Nothing is sent to a server.
6. **Step 4:** three to five photos with an oval guide, tips and a light check on the face area. A shot that looks like someone else is refused.
7. **Step 5:** optional cue notes (clothes, hair, glasses, voice). A look-alike warning if Sam is close to someone already added. Saved: "Sam is added", with **Try Whisper mode**.
8. **Whisper mode.** Full-screen camera, "Recognised on this phone only". A face the app is sure about (one face, at least a second and five frames, one facing the camera, clearly closer to one person than any other) gets an amber halo, the caption and the spoken line. Not sure: a dotted ring, "Could be Raj? Check: green parka", no speech. Anyone else: "No match". "Who was that?" lists the last five.
9. **Today's list:** pick who you'll see, then read or hear their lines before you walk in. They are marked "On today's list" in Whisper mode.
10. **Practice:** name people from their cues (or their photo, if that helps you); a gentle spaced schedule and "days you practised this week", never a streak.
11. **Settings and privacy:** output mode, voice (with an offline-voice check), volume, speed, chime, buzz, strictness, repeat interval, pause, bigger text, higher contrast, theme, Enhanced mode, backups, Delete everything, and Privacy with the six honest limits and the ledger.

Success: the user hears the right person's line within a couple of seconds of a steady view, and never hears a name for someone they didn't add.

## Screens and Layout
Tour, People, Add someone (five steps), Whisper mode, Person, Today, Practice, Settings, Backups, Privacy, a received consent answer, plus the separate consent page the other person opens and the landing page at `/` (the app lives at `/app/`). Navigation: a bottom tab bar with People, Today, a lit **Whisper** button in the middle, Practice and Settings.

## Look and Feel
From Harsh's brief ("beautiful and calm, large type, high contrast, accessible, one-handed") and the Hallmark skill he asked for: the Ribbon theme with an amber accent, Instrument Sans for headings and names, Atkinson Hyperlegible Next for reading (designed for low-vision readers), machined pill controls and faders, 52px controls and 48px icon buttons, light and dark modes, bigger-text and higher-contrast modes, reduced motion respected. The amber halo is the one memorable thing. Details: `docs/design.md`.

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
- Today's list and Practice as described in the journey.
  - [x] A list of three people shows their lines and cues and can be played in order.

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
- **Persistence:** people, notes, practice and today's list stay encrypted in this browser until deleted.
- **Limits:** the six honest limits on the landing page and the Privacy screen.

## Product Decisions
- Consent from the person being added, not just the owner (Harsh's brief; strengthened after the risk review).
- On-device only; works with no key and offline (Harsh's brief).
- Strangers are never stored or named; "No match", never "stranger" (Harsh's brief, wording from the risk review).
- Name: **Halo** (Harsh, by poll).
- Enhanced mode only as an opt-in, text-only extra (Harsh, by poll).
- **Agent recommendation:** the thresholds (confident under 0.42 with a 0.08 lead, maybe under 0.50), one second and five frames, 45 seconds before repeating, 50 people and 5 a day.

## What We're Building
Everything above: tour, consent-first enrolment, three-state Whisper mode, people, Today, Practice, settings, backups, privacy ledger, optional Enhanced mode, landing page, consent page, demo mode.

## Deferred From the POC
- Per-person thresholds and photo refresh reminders.
- Smart-glasses camera and audio.
- Search by place or cue, and "last seen".

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
