# Demo: click path and shot checklist

For recording the submission video on a real phone. Bullets and questions only: the narration and the words on screen are Harsh's to write. Rules for the video are in [`docs/submission-checklist.md`](docs/submission-checklist.md); a headless reference recording of the same path (no sound, not a phone) is [`docs/shots/walkthrough.mp4`](docs/shots/walkthrough.mp4), with stills and timings in [`docs/shots/walkthrough/`](docs/shots/walkthrough/).

## Before recording

- [ ] Phone: Do Not Disturb on, notifications off, battery and clock tidy, no personal apps in the recents view.
- [ ] Open the app once online so it caches (needed for the offline shot).
- [ ] Earbuds paired; check that the phone's voice speaks with Wi-Fi off (Settings in Halo shows whether the voice is on the phone: see [`docs/device-test.md`](docs/device-test.md)).
- [ ] Laptop showing `public/demo/faces/sam.jpg` full screen (an AI-generated face), brightness up, no glare. Test that the phone finds the face from arm's length before recording.
- [ ] Fresh start in the app: Settings, **Delete everything**.
- [ ] Screen recording with internal audio on; test five seconds and play it back.
- [ ] No music. No logos or brands in frame (earbud case, laptop lid, browser bookmarks).
- [ ] Only AI-generated faces on screen, or a real friend who has agreed to appear on video.

## Click path (about 2 minutes of app footage)

0. (Optional, for a cold open) **See it in 60 seconds** on the first tour screen: the guide, two sample people recognised, the face never added, "That's Halo." Then **Start with the short tour**. Reference recording: `docs/shots/try-60-seconds.mp4`.
1. **Tour** (`/app/`): screen 1 with the quote, Next, screen 2, Next, screen 3.
   - **Check your earbud**, hear the test line, **Yes, in my earbud**, then **I understand, let's start**.
2. **Add Sam**: **Add someone**, name "Sam", Continue. (Alternative take: **Or say it all at once** and say *"This is Sam, my teammate from the hackathon, loves climbing, wears a green raincoat, we met at the hackathon"*; check the filled fields.)
   - Note: type *This is Sam, my teammate from the hackathon, loves climbing*; watch the whisper line update; try Short, Warm, Full. Continue.
3. **Sam's yes**: "Hand the phone to Sam". Sam reads the line, ticks **I'm Sam, and I agree**, taps **I agree**.
   - (Optional cut) **Not here? Send Sam a link to answer**.
4. **Photos**: point at the laptop, three shots inside the oval; Continue.
5. **Cues**: Usual clothes *Green raincoat*, Hair *Brown hair with a fringe*, Where you met *At the climbing gym*; **Save Sam**; "Sam is added."
6. **Whisper mode**: **Try Whisper mode**, point at the laptop. Wait for the light halo and the whisper in the earbud. Tap the caption to hear it again. **Who was that?**, Close.
7. **Not sure / no match**: Settings, **Add sample people**; People, **Open the demo camera**. Let Maya be recognised, then the face that was never added: "No match", nothing spoken.
8. **Pocket mode**: phone on a lanyard or in a shirt pocket, camera out; tap the pocket button; the screen goes dark; walk up to the laptop showing Sam's face and let the whisper (or the buzz) come; double-tap to wake.
9. **Offline**: Control Centre, airplane mode on; back in Halo, demo camera again; Maya is still recognised.
10. **Before you walk in**: Today, occasion *Dinner at Priya's*, tick Maya and Arjun, **Make today's list**, **Hear everyone's line**, turn on **Event mode**; demo camera: Walter and the never-added face stay "No match".
11. **Practice**: Start, read the cues, pick a name.
12. **Settings**: output (voice, chime, buzz, silent), quiet hours, pocket mode's buzz codes (**Feel it**), bigger text, dark theme. Optional: Enhanced mode sheet (read what would leave the phone, then **Keep everything**).
13. **A person**: where you met, **Never whisper**.
14. (Optional) **A helper**: on a second phone or laptop, open `/helper/`, prepare a card for Raj, send the link; open it on the phone, **Start adding Raj**.
15. **Privacy and honest limits**: the ledger ("0 faces, photos or face fingerprints sent"), scroll the six limits; then **Your data**: what's stored, the two-tap **Wipe now** (do this last, or on a second phone).
    - (Optional) **Lock**: set a passcode in Settings, close and reopen Halo, type it.
    - (Optional) The full **privacy page** in the browser: `/privacy/`.
16. **Delete everything**, confirm, back to the tour.

## Shot checklist

- [ ] Hook: a real moment before any app UI (door, hallway, a party), no faces of real people unless they agreed.
- [ ] Who it's for and what it does, in the first seconds.
- [ ] The app on the phone within the first minute.
- [ ] The consent handoff at real speed.
- [ ] The whisper audible, with the caption on screen matching the words.
- [ ] "No match" for a face that was never added, with a beat of silence.
- [ ] Pocket mode: the phone worn, not held, and the whisper or buzz arriving.
- [ ] Airplane mode, still recognised.
- [ ] Today and Practice, one quick cut each.
- [ ] Delete everything.
- [ ] How it was built: the repo with `scope.md`, `prd.md`, `spec.md` and `devpost/checklist.md`.
- [ ] One honest limit, and what's next.
- [ ] End card: name, repo URL, "All faces shown are AI-generated".
- [ ] Captions burned in for anything spoken; total under 3:00.

## Prompts for the voice-over (answers are yours)

- Who exactly is this for, and what goes wrong for them on an ordinary day?
- Which quote made you build it, and why that one?
- Why does the person being added have to agree on the phone themselves?
- What did you just hear in the earbud, and when does Halo stay quiet instead?
- Why is "No match" said instead of "stranger"?
- Why would someone wear the phone instead of holding it up, and what does a buzz code tell them?
- Who helps you prepare before a family event, and what would they put on a card?
- If you lost your phone tomorrow, what would someone find, and what would you do?
- What does "on this phone" mean, in plain words?
- How does someone prepare before a dinner or a meeting?
- What did scoping make you cut, and what did the build force you to change?
- Which limit would you want a user to know first?
- What would you build next, and with whom would you test it?

## Optional shots

- Bigger text and higher contrast on one screen.
- The landing page on the laptop: **Hear a whisper**, the note box.
- A friend who agreed, recognised in person (only with their consent to appear in the video).
