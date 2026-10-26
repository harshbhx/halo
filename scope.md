---
doc: scope
status: approved
---

# Face Whisper

A phone web app that quietly tells someone with face blindness who they are looking at, using only faces they enrolled with consent, and only on their own phone.

> Process note: the interview answers behind this scope come from Harsh's written brief (problem, user quotes, privacy rules, screens), relayed to the coding agent running the Devpost Learn skills. Harsh approved the brief as the plan.

## The Unique Kernel
Recognition that runs entirely on the user's phone and turns a recognised face into a **spoken whisper with context**, not a name tag: "Raj, your neighbour, knee surgery last month." The whisper comes from a short voice or typed note the user recorded at enrolment. Strangers are never stored or identified; the app only ever recognises people who agreed to be added.

## Who It's For
An adult with prosopagnosia (about 2% of people) who meets the same neighbours, colleagues and relatives every week and still cannot place them. Today they guess from voice, clothes, hair or context, avoid greeting people first, or carry photo cards, which do not help: "photo contact cards don't help, I'd only be practicing to recognize that specific picture."

Their words (r/prosopagnosia):
- "What we need is some dude saying in our ears 'yes, you know that person it's <name>'" ([thread 1th3clh](https://www.reddit.com/r/prosopagnosia/comments/1th3clh/))
- "glasses that would tell me who people are and how I know them" ([thread 1r58f5g](https://www.reddit.com/r/prosopagnosia/comments/1r58f5g/))
- "photo contact cards don't help, I'd only be practicing to recognize that specific picture" ([thread 1v0faz5](https://www.reddit.com/r/prosopagnosia/comments/1v0faz5/))

Nothing like this ships today: Meta's name-tag idea for its glasses is unreleased and the rest are research prototypes.

## The Core Loop
1. With the person's agreement, the user takes 3 to 5 photos of them and says or types a short note ("This is Raj, my neighbour, had knee surgery last month").
2. The note becomes a one-line whisper.
3. Out in the world, the user opens Whisper mode with an earbud in. When an enrolled face appears, a soft ring settles around it and the whisper is spoken quietly in their ear, with a small caption.

They come back because every encounter with someone they enrolled gets easier, and the people list grows with their life.

## Inspiration & Identity
Calm, kind and quiet, like a friend leaning in. Large type, high contrast, one-handed use on a phone. It should feel like an accessibility tool people trust, not a surveillance product. A visible "recognised on this phone only" badge whenever the camera is on.

## Why This Matters to the Learner
Harsh picked this from first-person accounts of people with face blindness asking for exactly this ("some dude saying in our ears"), and from the fact that it can now be built privately: face matching in the browser, speech in the browser, no server.

## What "Working" Looks Like
A judge opens the app on a phone, reads a one-screen privacy promise, enrols a friend in about 20 seconds (consent tick, three photos, a spoken note), switches to Whisper mode, points the camera at the friend and **hears** "Sam, your teammate from the hackathon, likes climbing", with a soft ring around Sam's face. Pointing at someone not enrolled shows nothing personal: they stay "not someone you've added". One button deletes everything.

The "oh, that's cool" beat: the whisper in the ear, with context, from a phone that never sent a face anywhere.

## The POC Boundary
- Consent-first enrolment: consent tick, camera capture of 3 to 5 shots, a voice note (browser dictation) or typed note, optional cue notes (usual clothes, hair, glasses).
- Note to whisper: works with no key at all (rule-based rewrite); uses an on-device model if the browser offers one.
- Whisper mode: live camera, on-device detection and matching, soft ring, spoken whisper (browser speech) and caption, unknown faces stay unknown.
- People list with edit and delete; settings for voice, volume and speaking rate; delete everything.
- Privacy screen and honest limits (lighting, angles, may be wrong, never for security decisions).
- A demo mode with synthetic (AI-generated, not real) sample faces so anyone can see it work alone.

## Later
- Smart-glasses or bone-conduction earpiece integration.
- Optional cloud voice (generated voice) through a key-holding proxy.
- Encrypted export/import of the people list to a new phone.
- "Where did we meet" reminders from calendar context.

## Explicitly Cut
- Any server-side face storage or matching: breaks the privacy promise.
- Identifying strangers or searching faces online: the app is for people who agreed to be added, never anyone else.
- Accounts and cloud sync: not needed to prove the kernel, and they add a place for face data to leak.
- Native app: a phone browser with camera and speech is enough for the proof.
