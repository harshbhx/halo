---
doc: scope
status: approved
---

# Halo

A quiet voice for faces you know: a phone web app that helps people with face blindness place the people they meet, using only faces of people who agreed, and only on their own phone.

> **How this was made.** Built with an AI coding agent running the Devpost Learn skills (this scope, the PRD and the spec, then the build checklist), working from Harsh's written brief and his decisions along the way: the idea, the privacy rules, the name Halo, keeping Enhanced mode optional and text-only, the design direction, and the second round of features (pocket mode, event mode, a helper, Halo in 60 seconds and more). The agent wrote the documents and the code; Harsh reviewed and decided.
>
> **Harsh's own notes (to fill in):** _[what you tried yourself on your phone, what you changed your mind about, what surprised you]_

## The Unique Kernel
Recognition that runs entirely on the user's phone and turns a recognised face into a **spoken reminder with context**, not a name tag: "Raj, your neighbour. Knee surgery last month." The line comes from a note the user wrote, the person being added reads it and agrees, and the app only speaks when it is sure; otherwise it asks "Could be Raj?" or says "No match". It never recognises anyone who didn't agree.

## Who It's For
An adult with prosopagnosia (lifelong face blindness affects roughly 2% of people, [Kennerknecht et al. 2006](https://doi.org/10.1002/ajmg.a.31343)) who meets the same neighbours, colleagues and relatives every week and still can't place them. Today they rely on voices, clothes and context, avoid greeting first, or ask a partner. In their words, from public posts on r/prosopagnosia:

- "What we need is some dude saying in our ears "yes , you know that person it's insert name"" and "My boyfriend does it for me. I need that but like, in my earphones, for when he's not around." (u/Adventurous_Kiwi, [thread](https://www.reddit.com/r/prosopagnosia/comments/1th3clh/))
- "The contact cards would not help me, unfortunately. I'd only be practicing to recognize that specific picture of my friend." (u/HereForMcCormackAMA, [thread](https://www.reddit.com/r/prosopagnosia/comments/1v0faz5/))
- "I'd like it to have only a database of people I actually care about... I want to know who they are and where I met them before. ... But just seeing the names of people standing in line next to me at the store or walking down the street would be both useless and overwhelming." (u/EinsTwo)
- And the objection to take seriously: "What would actually be useful is something that could recognize and label someone as I'm speaking to them, but I feel like that's more in the realm of smart glasses than phones because I'm not going to go around pointing my phone at everyone." (u/Ilaxilil, [thread](https://www.reddit.com/r/prosopagnosia/comments/1th3clh/))

**What exists already.** Taught-face recognition ships for blind and low-vision users ([OrCam MyEye](https://knowledgebase.orcam.com/knowledge/how-do-i-use-face-recognition-on-my-orcam-myeye), [Envision's Teach a Face](https://support.letsenvision.com/hc/en-us/articles/8118364337297)); [NameVault](https://apps.apple.com/app/id1525602410) drills names from photos; SocialRecall was a 2018 concept. Meta's name-tag idea for its glasses is unreleased. Halo's difference: it is for people who see but can't place faces, it says *how you know* someone, shows the cues they actually use, briefs them before an event, asks the person themselves to agree, and runs free in a browser with nothing uploaded.

## The Core Loop
1. With the person's agreement, the user writes a short note ("This is Raj, my neighbour, had knee surgery last month"), hands them the phone to read the line it will say and tap "I agree", takes three photos and adds cue notes.
2. Before an event, the user can pick who they'll see and hear their lines.
3. Out in the world, Whisper mode listens through the camera. When it's sure, a soft amber halo settles on the face and the line is whispered into an earbud; when it isn't, it shows "Could be Raj? Check: green parka" and stays quiet.

They come back because every encounter with someone they added gets a little easier, and practice from cues keeps names fresh.

## Inspiration & Identity
Calm and kind, like a friend leaning in. Designed with the Hallmark design skill: its Ribbon theme (warm dawn paper, a blue-black night, Instrument Sans over Atkinson Hyperlegible Next, machined controls lit from above) with one amber "lit window" accent: the halo. It should feel like an assistive tool people trust, never surveillance. A visible "Recognised on this phone only" badge whenever the camera is on.

## Why This Matters to the Learner
Harsh picked this from first-person accounts of people with face blindness asking for exactly this, and because it can now be built privately: face matching, speech and storage all inside the browser.

## What "Working" Looks Like
Someone opens Halo on a phone, reads a short tour and the promise, adds a friend in about a minute (the friend reads the line and agrees on the phone), switches to Whisper mode with an earbud in, points the camera at the friend and **hears** "Sam, your teammate from the hackathon. Loves climbing." with a soft amber ring around Sam's face. Pointing at someone not added shows "No match" and nothing is stored. One button deletes everything. With nobody else around, the demo camera shows three AI-generated sample people being recognised and a fourth staying "No match".

## The POC Boundary
- Consent-first enrolment: the note and whisper line first, then the person reads the line and agrees on the phone (or by a link on their own phone), three to five photos, optional cue notes; children only ever reach "Could be …?".
- Note to whisper on the phone with built-in rules (an on-device model if the browser has one); short, warm and full styles.
- Whisper mode: on-device detection and matching, three states (confident, maybe, no match), soft halo and caption, browser voice only after an earbud check; "Who was that?" for the last five in memory.
- Pocket mode: the phone worn at chest height, screen dark and kept awake, whispers in the earbud or buzz codes. It answers "I'm not going to go around pointing my phone at everyone" as far as a phone can.
- Event mode: Whisper mode looks only for the people on today's list.
- Where you met, per person; adding someone by saying one sentence; quiet hours and "never whisper".
- A helper: a trusted person prepares a card as text and sends it as a link; photos are still taken in person.
- Halo in 60 seconds: a guided minute with the sample people, before the tour, with no camera.
- People, Today's list, Practice from cues or photos, Settings (voice, volume, speed, output mode, strictness, bigger text, higher contrast, theme), backups locked with a passphrase, Delete everything.
- Privacy and limits screen with the six honest limits and a ledger of anything that left the phone.
- Optional Enhanced mode, off by default and text only: a natural voice, whispers in other languages, a cloud whisper writer.
- A landing page, and a demo with AI-generated sample faces.

## Later
- Smart glasses or bone-conduction audio (the form factor people asked for; pocket mode is the phone's stand-in).
- Per-person thresholds measured at enrolment, and a yearly photo refresh.
- An automatic "last seen" and search by cue or place (today Halo keeps only the where-you-met line you type or say).
- A real-world test with consenting adults, published honestly.

## Explicitly Cut
- Any server-side face storage or matching: breaks the privacy promise.
- Identifying strangers or searching faces online: the app is only for people who agreed.
- Accounts and cloud sync: not needed, and another place for data to leak.
- A native app: a phone browser is enough to prove the idea.
