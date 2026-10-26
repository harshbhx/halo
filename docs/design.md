# Design

Halo's look and the decisions behind it. Built with the [Hallmark](https://github.com/Nutlope/hallmark) design skill (MIT), installed in this project only (`.claude/skills/hallmark`, via `npx skills add nutlope/hallmark --agent claude-code -y`). The tokens are in [`src/styles/tokens.css`](../src/styles/tokens.css) (app) and [`landing/tokens.css`](../landing/tokens.css) (landing page); Hallmark's record of the run is in [`.hallmark/picks.md`](../.hallmark/picks.md) and [`.hallmark/log.json`](../.hallmark/log.json).

## Intent

- **Who:** adults with face blindness, often in a social moment, often one-handed, sometimes anxious. Many have low vision or read on a small screen in poor light.
- **Feel:** calm and kind, like a friend leaning in to remind you. An assistive tool people trust, never surveillance.
- **One memorable thing:** the amber halo that settles on a face you know. Everything else stays quiet so it can carry the product.

## Theme: Ribbon, with an amber halo

Hallmark dealt the Ribbon theme: the hour drawn as light. A warm dawn paper for the day, a blue-black "two in the morning" night, machined parts lit from above. Halo keeps one accent in both modes, the amber of a lit window, and it is the halo.

| Token | Light | Night / dark | Use |
|---|---|---|---|
| `--color-paper` | `oklch(98.2% 0.008 82)` | `oklch(13.2% 0.022 258)` | Page |
| `--color-ink` | `oklch(18% 0.006 80)` | `oklch(93.5% 0.012 85)` | Text |
| `--color-muted` | `oklch(44% 0.012 80)` | `oklch(74% 0.02 255)` | Secondary text, numbers |
| `--color-accent` | `oklch(80% 0.12 72)` | `oklch(82% 0.095 68)` | Primary buttons, the lit Whisper tab |
| `--halo` | `oklch(82% 0.11 70)` | same | The ring and the name label in Whisper mode |
| `--color-focus` | `oklch(48% 0.12 60)` | `oklch(84% 0.1 68)` | Focus rings (3px) |

Whisper mode and the landing hero always sit on the night, whatever the mode. **Higher contrast** steps muted text and rules toward the ink.

## Type

- **Instrument Sans** 400 and 500 for headings and names (display weight 400, tracking -0.03em on display sizes).
- **Atkinson Hyperlegible Next** 400 and 700 for reading. It was designed by the Braille Institute for low-vision readers; letters like I, l and 1 are distinct.
- Root size 18px in the app (21px with **Bigger text**), a 1.2 ratio, body never under 16px. Both families are self-hosted.

## Space, shape, depth

- A 4px-based scale (`--space-2xs` 4px to `--space-4xl` 144px).
- Controls 52px tall, icon buttons 48px, tab bar 76px: thumb-sized for one hand.
- Radius by nesting level: cards 20px, inputs 14px, small parts 6px, pills for controls and round faces.
- Depth from light, not from blur: a hairline top highlight (`--edge-light`), a short cast shadow on raised parts, a sunk bed for tracks and segmented controls.

## Components

- **Buttons:** one filled primary per screen (amber); secondary buttons are paper with a hairline; quiet buttons are text. Every control has hover, focus-visible, active, disabled and busy states.
- **Segmented control:** a sunk bed with a raised, lit segment (whisper style, output mode, theme).
- **Faders:** volume and speed as a machined fader: a sunk track, an amber fill to the level, a tick scale either side, a gripped cap with a lit index line.
- **Switches** for on/off settings; **sheets** for confirmations (delete, Enhanced mode consent) that say exactly what happens.
- **People list:** name tags (round face, name, the line, a play button), not cards.
- **Tab bar:** People, Today, a lit **Whisper** lamp in the middle, Practice, Settings.
- **Whisper mode:** the night, a "Recognised on this phone only" badge, the camera, the ring states (amber halo for confident, dotted for maybe, a faint dashed outline for no match), a caption card with the line, cues and where you met, five round controls (mute, pause, switch camera, who was that, pocket mode).
- **Notes under the status line:** small night pills for "silent until you check your earbud", quiet hours and event mode, so the state that changes what you hear is always on screen.
- **Pocket mode:** the night at its darkest (`--pocket`, near black so an OLED screen is nearly off), one line of status in large type, a plain **Wake the screen** button and double-tap to wake. Buzz codes stand in for sound: two short, three short, one long.
- **The 60-second coach:** a compact card on the night with the step, a timer, three progress marks that light amber, and an explicit "Play whispers aloud" toggle; it ends in a summary sheet.
- **Helper page:** the consent page's system (dawn paper, one form, the line set large and written live), so a helper sees the same product.

## Motion

Only `transform` and `opacity`, 120 to 420ms with an ease-out, plus one signature: when a face becomes confident, two soft ripples leave it and the halo settles (about 0.9s, once per person on a track). `prefers-reduced-motion` turns the bloom and smooth scrolling off.

## Accessibility

Checked by [`tests/e2e/a11y.spec.ts`](../tests/e2e/a11y.spec.ts), which runs axe-core with the WCAG 2.0, 2.1 and 2.2 A and AA rules on the landing, helper and consent pages and on every app screen in light and dark (tour, people, today, practice, settings, privacy, a person, add someone, Whisper mode, pocket mode). Result on the final build: no serious or critical findings on any of them, and no minor ones either. Axe can't judge everything; the items below were checked by hand or by the same test file.

- **Screen readers.** Every screen has one `h1`; on each route change, each tour step, entering pocket mode and the end of the 60-second try, focus moves to the new heading or the main control, so the change is announced. A visually hidden live region says who was recognised; the 60-second coach's step text is a live region too. Icon-only buttons have labels ("Pocket mode: screen dark, phone at chest height", "Who was that? The last five whispers"); toggles use `aria-pressed` or `role="switch"` with `aria-checked`. The camera video and canvas are `aria-hidden`: everything they show is also in text.
- **Keyboard.** Every control is a real button, link or input, reachable with Tab in reading order, with a 3px focus ring (the test checks the ring on each tour control). Sheets are native `<dialog>` elements, so Escape closes them and focus stays inside. Pocket mode returns focus to its own button when you wake the screen.
- **Reduced motion.** `prefers-reduced-motion` turns off screen transitions, the halo bloom, smooth scrolling and the loader; the test checks the step animation is `none`.
- **Not only sound.** Speech is never the only output: captions always show, and buzz, chime and silent modes exist. Nothing is said aloud before the earbud check, in quiet hours, or for anyone marked "never whisper".
- **Reading.** Contrast passes in both modes; **Higher contrast** steps muted text and rules toward the ink; **Bigger text** scales the whole interface; body text is never under 16px; Atkinson Hyperlegible Next for reading.
- **Touch.** Controls are at least 48px; the main ones 52px; the Whisper mode buttons 56px.

## The landing page

Hallmark shape: **Narrative Workflow** (swapped from the drawn Marquee Hero, because the product needs explaining and has a real sequence). Counter hero: the headline and two actions beside a real capture of Whisper mode. The page whispers: **Hear a whisper** speaks a real line in the browser's voice, and the note box turns a typed note into a whisper with the app's own rules. Sections: their words, four stages, before you walk in, the promise on the night under drawn stars, honest limits, fair questions, close. Every picture is a screenshot of the real app taken by its own Playwright run.

## How Hallmark was used

1. **Pre-flight and before record:** `sloplint --before` on the first version recorded 44 FAIL, 56 REFLEX and 20 WARN (tracked-caps labels, colour literals, animated widths, glass panels, raw spacing). The record itself stays local (`.hallmark/before.txt`, ignored by Hallmark's own `.gitignore`).
2. **Theme deal:** `theme.mjs deal` with the editorial and playful genres; Ribbon was dealt (3/3 and 1/3). `theme.mjs draw --material product --job try --theme ribbon` drew the landing shape (draw `aaf455`).
3. **Scaffold:** `theme.mjs scaffold ribbon --redesign full --scope app --dir src/styles` and `theme.mjs scaffold ribbon --dir landing` wrote the tokens and base styles; the app's original body face (Atkinson Hyperlegible Next) and the ring signature were kept.
4. **Design before code:** the picks (theme, shape, chrome, hero, sections, material) were written to `.hallmark/picks.md` before building.
5. **Sweeps:** `sloplint` static and `--render` (Chromium through `puppeteer-core`) on the app (`--scope app`) and the landing page, repeated until clean. Gates fixed along the way include tracked caps, off-scale spacing, colour literals, width animations, glass, middle-dot bullets, a filled pressed state, two filled hero buttons, content hidden without JavaScript, the hero over the fold and word counts.
6. **Reviews in fresh context:** a hero review (verdict *fix*, 5 findings, 4 resolved, 1 partial: the night drawn as light) and a finish review (verdict *fix*, 8 findings, all resolved: an old capture, the horizon's edges and fold, a cropped consent capture, the close line against its capture, a faded label, the faders, amber numbers, an empty gap).
7. **Second round** (pocket mode, the coach, the notes, the helper page, quiet hours, event mode): swept again with the helper page added to the app scope. It found one FAIL (gate 34: the tour footer ran 50px past a 375px screen once "See it in 60 seconds" joined it) and two REFLEX (gates 7b and 22: pocket mode's pure black). All fixed: the footer wraps, and the black is now the night at its darkest.
8. **Final state:** app and helper page 0 FAIL, 0 REFLEX, 0 WARN, 2 waived (28b: the live camera video has no poster), 20 dismissed with reasons in the stamps; landing 0 FAIL, 0 WARN, 4 dismissed (verbatim quotes, one-sentence ledes), 2 notes (word count: the quotes and the six limits are fixed wording).

## Evidence

Every screen in light and dark, phone and desktop: [`docs/shots/`](shots/) and the contact sheets `docs/shots/contact-sheet-*.png`.
