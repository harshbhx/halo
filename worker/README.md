# Halo Enhanced mode Worker

Optional, off by default. One Cloudflare Worker serves the built site and five small routes. It receives only text or a short voice clip the user chose to send, never faces, photos or face fingerprints, stores nothing and logs no request content.

| Route | Sends | Model | Returns |
|---|---|---|---|
| `POST /api/session` | nothing | none | a signed one-hour token |
| `POST /api/voice` | `{ text ≤ 200, lang }` | `@cf/myshell-ai/melotts` | `audio/mpeg` |
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

Then point `halo.dualmindlab.tech` at the Worker. Recommended: a Workers AI spending alert, and AI Gateway with logging off if you route calls through it. Still to check on the live account: which MeloTTS languages return audio, the exact response shapes of IndicTrans2 and m2m100 (the code accepts both known shapes), and which browser recording formats Whisper accepts.
