# Contributing to Halo

Thanks for helping. Halo is a prototype for people with face blindness, so the rules about privacy and honesty matter more than usual.

## Set up

You need Node 20 or newer (and ffmpeg if you want the fake-camera clips and mp4 videos).

```bash
git clone https://github.com/harshbhx/halo.git
cd halo
./run.sh            # installs on first run, builds, serves on http://localhost:4173
```

The landing page is at `/` and the app at `/app/`. The camera works on `localhost`; for a phone use an HTTPS address.

## Test

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Type check, Vite build, and the external-request check |
| `./run.sh test` | Unit tests and end-to-end tests (Playwright, Chromium, fake camera) |

CI runs the typecheck, unit tests and build on every pull request. Please run them before you push.

## Privacy rules for contributors

These are not optional.

- **No real faces or photos of people** in issues, pull requests, discussions, test fixtures or screenshots. Every face in this repository is an AI-generated image of a person who does not exist (see [CREDITS.md](../CREDITS.md)). If you need a face for a test, use those.
- **Do not attach face fingerprints, backups or exports** from a real phone to an issue.
- **Never add a network call** (fetch, WebSocket, beacon, script, font, image or stylesheet from another origin) without updating the written [privacy page](../privacy/index.html) and the drift test `tests/unit/privacy-drift.test.ts` in the same pull request. The Content-Security-Policy allows `connect-src 'self'` only, and `npm run build` fails if the build loads anything from another origin.
- No analytics, trackers, third-party scripts or fonts.
- Faces, photos and face fingerprints must never leave the phone, and never be sent to the optional Worker.
- Keep the six honest limits word for word on the landing page and in the app, and keep the claims in the README true. Do not claim accuracy that has not been measured ([docs/accuracy.md](../docs/accuracy.md)).

## Pull requests

- Open an issue first for anything large.
- Branch from `main`, keep the change focused, and describe what changed and how you checked it.
- Add or update tests for behaviour changes. Screens that change should keep passing the axe accessibility tests.
- Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting problems

- Bugs and ideas: use the issue templates.
- A wrong match: use the "Wrong match report" template, and **do not attach photos of people**.
- Security: see [SECURITY.md](SECURITY.md). Do not open a public issue.
