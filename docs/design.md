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
- **Whisper mode:** the night, a "Recognised on this phone only" badge, the camera, the ring states (amber halo for confident, dotted for maybe, a faint dashed outline for no match), a caption card with the line and cues, four round controls.

## Motion

Only `transform` and `opacity`, 120 to 420ms with an ease-out, plus one signature: when a face becomes confident, two soft ripples leave it and the halo settles (about 0.9s, once per person on a track). `prefers-reduced-motion` turns the bloom and smooth scrolling off.

## Accessibility

- Contrast passes in both modes; higher contrast mode for more.
- Focus rings everywhere (3px, offset).
- A visually hidden live region announces who was recognised; captions always accompany speech.
- Speech is never the only output: buzz, caption and chime modes; nothing aloud before the earbud check.
- Bigger text scales the whole interface, not just body copy.

## The landing page

Hallmark shape: **Narrative Workflow** (swapped from the drawn Marquee Hero, because the product needs explaining and has a real sequence). Counter hero: the headline and two actions beside a real capture of Whisper mode. The page whispers: **Hear a whisper** speaks a real line in the browser's voice, and the note box turns a typed note into a whisper with the app's own rules. Sections: their words, four stages, before you walk in, the promise on the night under drawn stars, honest limits, fair questions, close. Every picture is a screenshot of the real app taken by its own Playwright run.

## How Hallmark was used

1. **Pre-flight and before record:** `sloplint --before` on the first version recorded 44 FAIL, 56 REFLEX and 20 WARN (tracked-caps labels, colour literals, animated widths, glass panels, raw spacing). The record itself stays local (`.hallmark/before.txt`, ignored by Hallmark's own `.gitignore`).
2. **Theme deal:** `theme.mjs deal` with the editorial and playful genres; Ribbon was dealt (3/3 and 1/3). `theme.mjs draw --material product --job try --theme ribbon` drew the landing shape (draw `aaf455`).
3. **Scaffold:** `theme.mjs scaffold ribbon --redesign full --scope app --dir src/styles` and `theme.mjs scaffold ribbon --dir landing` wrote the tokens and base styles; the app's original body face (Atkinson Hyperlegible Next) and the ring signature were kept.
4. **Design before code:** the picks (theme, shape, chrome, hero, sections, material) were written to `.hallmark/picks.md` before building.
5. **Sweeps:** `sloplint` static and `--render` (Chromium through `puppeteer-core`) on the app (`--scope app`) and the landing page, repeated until clean. Gates fixed along the way include tracked caps, off-scale spacing, colour literals, width animations, glass, middle-dot bullets, a filled pressed state, two filled hero buttons, content hidden without JavaScript, the hero over the fold and word counts.
6. **Reviews in fresh context:** a hero review (verdict *fix*, 5 findings, 4 resolved, 1 partial: the night drawn as light) and a finish review (verdict *fix*, 8 findings, all resolved: an old capture, the horizon's edges and fold, a cropped consent capture, the close line against its capture, a faded label, the faders, amber numbers, an empty gap).
7. **Final state:** app 0 FAIL, 0 REFLEX, 0 WARN, 2 waived (28b: the live camera video has no poster), 18 dismissed with reasons in the stamp; landing 0 FAIL, 0 WARN, 4 dismissed (verbatim quotes, one-sentence ledes), 2 notes (word count: the quotes and the six limits are fixed wording).

## Evidence

Every screen in light and dark, phone and desktop: [`docs/shots/`](shots/) and the contact sheets `docs/shots/contact-sheet-*.png`.
