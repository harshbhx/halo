# Halo Enhanced mode Worker

Optional, off by default. One Cloudflare Worker serves the built site and five small routes. It receives only text or a short voice clip the user chose to send, never faces, photos or face fingerprints, stores nothing and logs no request content.

| Route | Sends | Model | Returns |
|---|---|---|---|
| `POST /api/session` | nothing | none | a signed one-hour token |
| `POST /api/voice` | `{ text ≤ 200, lang }` | `@cf/myshell-ai/melotts` | `audio/wav` (labelled from the bytes) |
| `POST /api/translate` | `{ text ≤ 300, target }` | `@cf/ai4bharat/indictrans2-en-indic-1B` (Indian languages), `@cf/meta/m2m100-1.2b` (others) | `{ text }` |
| `POST /api/write` | `{ name ≤ 60, note ≤ 500 }` | `@cf/meta/llama-3.2-3b-instruct` | `{ whisper }` |
| `POST /api/transcribe` | audio ≤ 1 MB (about 30 s) | `@cf/openai/whisper-large-v3-turbo` | `{ text }` |

Guards: POST only; the `Origin` must be `APP_ORIGIN` (no CORS headers are ever sent); a signed session token on every route; strict schemas (unknown fields, `image/*` bodies and oversize input are refused); a per-IP rate limit (`RL`, 20 a minute); an approximate per-instance daily ceiling (`DAILY_LIMIT`, no storage on purpose); `Cache-Control: no-store`; errors carry a plain message, never the request content. Unit tests with Workers AI mocked: `tests/unit/worker.test.ts`.

## Deploy (for the owner, not run by any script here)

```bash
npm run build                                   # dist/ with the strict CSP in dist/_headers
npx wrangler secret put SESSION_SECRET          # a long random string
npx wrangler deploy                             # Workers AI and the rate limiter are bindings: no API keys
```

`wrangler.jsonc` carries a `routes` entry with `custom_domain: true`, so `wrangler deploy` creates the DNS record for `halo.dualmindlab.tech` itself. With more than one Cloudflare account on the login, set `CLOUDFLARE_ACCOUNT_ID` first.

## Live results (checked 26 Oct 2026 on https://halo.dualmindlab.tech)

- `/api/session` works from `https://halo.dualmindlab.tech` and returns 403 for any other or missing `Origin`, 405 for GET. A body of type `image/*` returns 415; an unknown field returns 400; no session token returns 401.
- MeloTTS voice (`lang` as the worker sends it): `en`, `es`, `fr`, `zh`, `jp`, `kr` returned audio. The audio is WAV (16-bit mono PCM), not MP3, so the worker now labels it `audio/wav` from the file header and the app plays it with the matching type. Other languages are refused by the worker with a plain message and the phone's own voice speaks instead.
- IndicTrans2 returned `{ translations: [string] }`, and m2m100 returned `{ translated_text }`; both shapes are what the code reads. Tested to `hi`, `gu`, `mr`, `bn`, `ta`, `es`, `fr`, `de`; all returned text in the right script.
- Llama 3.2 3B returns `{ response }` and the worker returns `{ whisper }`. A small model can add details that were not in the note (for example "checked out books" from "met at the library"), so treat its output as a draft.
- Whisper large-v3-turbo accepted a WAV clip and returned `{ text }`. Browser recording formats (webm/opus, mp4) were not tested live.
- Rate limit: the `RL` binding returns 429, but it is approximate. A burst of 300 requests at 30 in parallel from one address got 122 through and 178 refused. `DAILY_LIMIT` is a per-instance counter and is covered by unit tests only; it is a soft ceiling, not a billing cap.
- Recommended for the owner: a Workers AI spending notification in the Cloudflare dashboard (Billing, Notifications) for the DualMind Labs account.
