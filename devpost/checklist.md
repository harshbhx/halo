---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (Harsh's brief asked the agent to build and verify autonomously overnight and report; hands-on checkpoints happen when he wakes)

## Slices

- [x] **1. Enrol someone and hear their whisper**
  Becomes usable: Add a person with consent, photos from the camera and a typed note; open Whisper mode, point the camera at them, see the ring and caption and hear the whisper.
  Why now: This is the kernel (on-device recognition turning into a spoken whisper with context) and the riskiest part (face-api under Vite, models in a headless browser with a fake camera). Bootstrapping lives inside it.
  PRD ref: `prd.md > The Core Journey` (steps 3–7), `prd.md > Features and Behavior > Enrolling a person`, `prd.md > Features and Behavior > Turning a note into a whisper`, `prd.md > Features and Behavior > Whisper mode`
  Spec ref: `spec.md > Face engine`, `spec.md > Matcher`, `spec.md > Vault (encrypted storage)`, `spec.md > Whisper writer`, `spec.md > Voice and dictation`, `spec.md > Enrol flow`, `spec.md > Whisper mode`, `spec.md > File Structure`
  Build: Scaffold Vite + React + TypeScript, copy model weights, build faceEngine, matcher, vault, whisper, voice, dictation, the 4-step enrol flow and Whisper mode with overlay ring, caption and speech.
  Verify (mechanical): Unit tests for whisper, matcher and vault pass; production build succeeds; Playwright with a synthetic-face fake camera enrols a person and Whisper mode shows their name and whisper.
  Learner check: Open the app on a phone, enrol a friend who agreed, open Whisper mode and point at them: you should hear their whisper and see the ring.
  Commit: `Enrol people and whisper their name on recognition`

- [ ] **2. A calm, complete app around the kernel**
  Becomes usable: Welcome with the privacy promise, people list with edit and delete, settings with voice, volume, rate, strictness, theme and Delete everything, the privacy and limits page, bottom navigation.
  Why now: The judges' first 30 seconds depend on it, and Delete everything is a privacy promise that must be tested.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > Features and Behavior > Privacy and consent`, `prd.md > Features and Behavior > Managing people`, `prd.md > Features and Behavior > Settings`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > App shell and navigation`, `spec.md > Welcome and privacy`, `spec.md > People and person editing`, `spec.md > Settings`, `spec.md > Look and Feel`
  Build: Shell and routes, Welcome, Home empty and filled states, Person edit, Settings, Privacy, design tokens, motion and accessibility pass.
  Verify (mechanical): Unit tests and build pass; Playwright covers welcome, edit, delete person and delete everything returning to Welcome with an empty vault.
  Learner check: Go through Welcome, edit a person's whisper, change the voice, then Delete everything and confirm the app starts fresh.
  Commit: `Add welcome, people, settings and delete everything`

- [ ] **3. Try it alone with synthetic sample people**
  Becomes usable: "Try with sample people" adds three AI-generated people who do not exist; the demo camera shows them plus one face that was not added, which stays "Not someone you've added".
  Why now: Lets a judge see recognition without a second person, and proves the unknown-stays-unknown rule.
  PRD ref: `prd.md > Features and Behavior > Demo with sample people`
  Spec ref: `spec.md > Demo mode`
  Build: Sample faces with credits, on-device fingerprinting of the samples, canvas demo camera stream, Whisper mode source switch.
  Verify (mechanical): Playwright loads sample people, starts the demo camera, sees each sample name and an unknown label for the extra face; distances logged.
  Learner check: On a fresh install tap Try with sample people, open Whisper mode with the demo camera and watch the names and the unknown face.
  Commit: `Add demo mode with synthetic sample people`

- [ ] **4. Ready to demo and record**
  Becomes usable: `./run.sh` starts the app; `./run.sh fake-camera` opens Chromium with a synthetic-face camera; `npm run demo:record` produces the walkthrough video and screenshots; works offline after first load; README and DEMO.md explain everything.
  Why now: The submission needs a video, and the video agent gets only this folder.
  PRD ref: `prd.md > What We're Building`, `prd.md > Features and Behavior > Privacy and consent` (offline)
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Offline cache`
  Build: run.sh, fake-camera scripts, demo recording spec, service worker, README, DEMO.md, screenshots.
  Verify (mechanical): Fresh `./run.sh` serves the built app; the recording run writes the video and screenshots; the offline test reloads with the network off.
  Learner check: Run `./run.sh`, open the printed address and follow DEMO.md end to end.
  Commit: `Add run script, fake camera and demo recording`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1 (pending: Harsh was asleep during the build; Playwright evidence in `docs/shots/` stands in until he tries it)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: not started
Route and stops: not started
Edit outcome: not started
Reflection: not started
Activity mode: not started

## Revisions

- Slice 1 also built the design tokens, bottom bar and people list — enrolment needed somewhere to land, and the look and feel was cheaper to set once than to retrofit.
- Fake-camera clips are portrait 480x640 with the face at about arm's length — Chromium delivers the clip at its native size, and a landscape clip cropped to a phone screen made the face fill the whole view.
