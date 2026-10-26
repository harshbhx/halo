# Changelog

## 1.0.0 - 2026-10-26

First public release, built for Devpost's Build With AI: Basics.

- Add someone with their own yes: a typed note becomes a one-line whisper; the person reads it and agrees on the phone, or by a text-only link.
- Whisper mode with three states: confident (halo, caption, whisper), maybe (dotted ring, never spoken) and no match.
- Pocket mode, today's list and event mode, where-you-met lines, spoken enrolment, quiet hours and never-whisper people, a helper page, and practice.
- Privacy by design: faces, fingerprints and photos stay on the phone, encrypted in IndexedDB (AES-GCM, non-extractable key); strict CSP; no analytics; works offline.
- Your data screen, two-tap Wipe now, optional app lock, wrong-match reports, Help page.
- Hindi and Gujarati for the main flow (machine-translated and flagged), battery saver, installable app with a Reload prompt.
- Written privacy, terms and safety pages, with a test that fails if the code drifts from the privacy page.
- Optional Enhanced mode on one Cloudflare Worker (voice, translation, a written line); never faces, photos or fingerprints.
- Ajrakh-inspired palette in one file; accessibility checks (axe, WCAG 2.2 A and AA) on every screen.
- Tests: 90 unit (Vitest) and 25 end-to-end (Playwright).

Known limits: a prototype tested mainly on AI-generated faces, not yet with people who have face blindness; the face library is archived. See the [honest limits](README.md#honest-limits).
