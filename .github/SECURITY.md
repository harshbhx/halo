# Security policy

## Reporting a vulnerability

Please report privately through GitHub security advisories: go to the [Security tab](https://github.com/harshbhx/halo/security/advisories/new) of this repository and choose **Report a vulnerability**. Please do not open a public issue or discussion for a security problem, and do not include photos of real people in a report.

Halo is a prototype maintained by one person. Reports are read as soon as possible, but there is no guaranteed response time.

## What counts

Anything that could break Halo's promises:

- Faces, photos, face fingerprints, names or notes leaving the phone, or reaching the optional Worker.
- Any request to another origin, or a way around the Content-Security-Policy.
- The vault (IndexedDB, AES-GCM) readable without the key, or "Delete everything" and "Wipe now" leaving data behind.
- Consent links or helper cards carrying more than text, or being forgeable in a way that adds a person without their yes.
- Flaws in the optional Enhanced mode Worker (`worker/`): origin checks, session signing, schema and size caps, rate limits, logging of content.
- Secrets committed to the repository.

## What does not count

- Wrong or missed matches. Halo is a hint, not proof, and says so; report these with the "Wrong match report" template (no photos).
- The app lock being a lock screen rather than extra encryption. The app says this.
- Findings that need a rooted device, a malicious browser extension or physical access to an unlocked phone.
- Known limits of the archived face library (@vladmandic/face-api) unless they cause a privacy problem.

See also the [threat model](../docs/threat-model.md).
