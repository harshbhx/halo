/**
 * Halo's optional Enhanced mode, as one Cloudflare Worker on the app's own origin.
 *
 * It serves the static site (dist/) and answers five small routes under /api/.
 * Only text or a short voice clip the user chose to send ever arrives here:
 * never a face, a photo or a face fingerprint (image bodies are refused).
 * Nothing is stored and no request content is logged.
 *
 * NOT deployed from this repository. See worker/README.md.
 */

export interface Ai {
  run(model: string, input: unknown, options?: unknown): Promise<unknown>;
}

export interface Env {
  AI: Ai;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  RL?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  /** The only origin allowed to call /api, e.g. https://halo.dualmindlab.tech */
  APP_ORIGIN: string;
  /** Secret for the stateless session tokens (wrangler secret put SESSION_SECRET). */
  SESSION_SECRET: string;
  /** Requests a day this Worker instance will serve before saying no (approximate). */
  DAILY_LIMIT?: string;
}

export const MODELS = {
  voice: '@cf/myshell-ai/melotts',
  indic: '@cf/ai4bharat/indictrans2-en-indic-1B',
  m2m: '@cf/meta/m2m100-1.2b',
  write: '@cf/meta/llama-3.2-3b-instruct',
  transcribe: '@cf/openai/whisper-large-v3-turbo',
} as const;

/** Whisper languages: Indian languages go to IndicTrans2, the rest to m2m100. */
export const LANGUAGES: Record<string, { name: string; indic?: string; m2m?: string }> = {
  hi: { name: 'Hindi', indic: 'hin_Deva' },
  gu: { name: 'Gujarati', indic: 'guj_Gujr' },
  mr: { name: 'Marathi', indic: 'mar_Deva' },
  bn: { name: 'Bengali', indic: 'ben_Beng' },
  ta: { name: 'Tamil', indic: 'tam_Taml' },
  te: { name: 'Telugu', indic: 'tel_Telu' },
  pa: { name: 'Punjabi', indic: 'pan_Guru' },
  es: { name: 'Spanish', m2m: 'spanish' },
  fr: { name: 'French', m2m: 'french' },
  de: { name: 'German', m2m: 'german' },
  pt: { name: 'Portuguese', m2m: 'portuguese' },
};

/** Voices MeloTTS can speak. */
const VOICE_LANGS = new Set(['en', 'es', 'fr', 'zh', 'jp', 'kr']);

export const LIMITS = {
  jsonBytes: 4_000,
  audioBytes: 1_000_000, // about 30 seconds of compressed speech
  voiceChars: 200,
  translateChars: 300,
  nameChars: 60,
  noteChars: 500,
  sessionSeconds: 3600,
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const SECURITY = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...SECURITY, ...extra } });
}

/* ---------- Sessions: stateless, signed, one hour ---------- */

const enc = new TextEncoder();

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function makeSession(env: Env, now = Date.now()): Promise<string> {
  const expires = Math.floor(now / 1000) + LIMITS.sessionSeconds;
  return `${expires}.${await hmac(env.SESSION_SECRET, String(expires))}`;
}

export async function checkSession(env: Env, token: string | null, now = Date.now()): Promise<boolean> {
  if (!token || !/^\d+\.[\w-]+$/.test(token)) return false;
  const [expires, sig] = token.split('.');
  if (Number(expires) * 1000 < now) return false;
  return (await hmac(env.SESSION_SECRET, expires)) === sig;
}

/* ---------- Guards ---------- */

let day = '';
let served = 0;

/** An approximate daily ceiling per Worker instance (no storage on purpose). */
function countToday(env: Env, now = Date.now()): void {
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    served = 0;
  }
  served += 1;
  if (served > Number(env.DAILY_LIMIT ?? 2000)) throw new HttpError(429, 'Enhanced mode has reached today’s limit. Halo keeps working on the phone.');
}

export function resetCounter(): void {
  day = '';
  served = 0;
}

async function readJson(request: Request, allowed: string[]): Promise<Record<string, unknown>> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.startsWith('application/json')) throw new HttpError(415, 'Send JSON.');
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > LIMITS.jsonBytes) throw new HttpError(413, 'Too much text.');
  const text = await request.text();
  if (text.length > LIMITS.jsonBytes) throw new HttpError(413, 'Too much text.');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'That isn’t valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected an object.');
  for (const key of Object.keys(body)) if (!allowed.includes(key)) throw new HttpError(400, `Unexpected field: ${key}.`);
  return body as Record<string, unknown>;
}

function str(body: Record<string, unknown>, key: string, max: number, required = true): string {
  const value = body[key];
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${key} is required.`);
  if (value.length > max) throw new HttpError(413, `${key} is too long.`);
  return value.trim();
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i);
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/* ---------- Routes ---------- */

async function voice(env: Env, request: Request): Promise<Response> {
  const body = await readJson(request, ['text', 'lang']);
  const text = str(body, 'text', LIMITS.voiceChars);
  const lang = str(body, 'lang', 8, false) || 'en';
  if (!VOICE_LANGS.has(lang)) throw new HttpError(400, 'No natural voice for that language yet; the phone’s own voice will speak it.');
  const out = (await env.AI.run(MODELS.voice, { prompt: text, lang })) as { audio?: string } | ReadableStream | Uint8Array;
  let audio: ArrayBuffer;
  if (out instanceof Uint8Array) audio = out.slice().buffer as ArrayBuffer;
  else if (out && typeof out === 'object' && 'audio' in out && typeof out.audio === 'string') audio = fromBase64(out.audio).buffer as ArrayBuffer;
  else if (out instanceof ReadableStream) audio = await new Response(out).arrayBuffer();
  else throw new HttpError(502, 'The voice service didn’t answer. The phone’s own voice will speak instead.');
  return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', ...SECURITY } });
}

async function translate(env: Env, request: Request): Promise<Response> {
  const body = await readJson(request, ['text', 'target']);
  const text = str(body, 'text', LIMITS.translateChars);
  const target = LANGUAGES[str(body, 'target', 8)];
  if (!target) throw new HttpError(400, 'That language isn’t available.');
  let result = '';
  if (target.indic) {
    const out = (await env.AI.run(MODELS.indic, { text: [text], target_language: target.indic })) as { translations?: string[]; translated_text?: string };
    result = out.translations?.[0] ?? out.translated_text ?? '';
  } else if (target.m2m) {
    const out = (await env.AI.run(MODELS.m2m, { text, source_lang: 'english', target_lang: target.m2m })) as { translated_text?: string };
    result = out.translated_text ?? '';
  }
  if (!result.trim()) throw new HttpError(502, 'The translation didn’t come back. The whisper stays in English.');
  return json({ text: result.trim().slice(0, LIMITS.translateChars * 2) });
}

const WRITER = [
  'You write one short line that will be whispered to someone with face blindness,',
  'reminding them who the person in front of them is. Use second person ("your neighbour").',
  'Start with the name. At most 14 words. Keep only facts from the note. No quotes, no emoji.',
].join(' ');

async function write(env: Env, request: Request): Promise<Response> {
  const body = await readJson(request, ['name', 'note']);
  const name = str(body, 'name', LIMITS.nameChars);
  const note = str(body, 'note', LIMITS.noteChars);
  const out = (await env.AI.run(MODELS.write, {
    messages: [
      { role: 'system', content: WRITER },
      { role: 'user', content: `Name: ${name}\nNote: ${note}\nWhisper:` },
    ],
    max_tokens: 60,
    temperature: 0.2,
  })) as { response?: string };
  const line = (out.response ?? '').replace(/["“”]/g, '').split('\n')[0].trim();
  if (!line || line.split(/\s+/).length > 22) throw new HttpError(502, 'No whisper came back. The phone’s own rules will write it.');
  return json({ whisper: /[.!?]$/.test(line) ? line : `${line}.` });
}

async function transcribe(env: Env, request: Request): Promise<Response> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.startsWith('audio/')) throw new HttpError(415, 'Send a short voice note (audio only).');
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > LIMITS.audioBytes) throw new HttpError(413, 'Voice notes can be up to about 30 seconds.');
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) throw new HttpError(400, 'The voice note was empty.');
  if (bytes.length > LIMITS.audioBytes) throw new HttpError(413, 'Voice notes can be up to about 30 seconds.');
  const out = (await env.AI.run(MODELS.transcribe, { audio: toBase64(bytes) })) as { text?: string };
  const text = (out.text ?? '').trim();
  if (!text) throw new HttpError(502, 'Nothing was heard. Try again, or type the note.');
  return json({ text: text.slice(0, LIMITS.noteChars) });
}

/* ---------- The handler ---------- */

const ROUTES: Record<string, (env: Env, request: Request) => Promise<Response>> = {
  '/api/voice': voice,
  '/api/translate': translate,
  '/api/write': write,
  '/api/transcribe': transcribe,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }
    try {
      if (request.method !== 'POST') throw new HttpError(405, 'Use POST.');
      // Only Halo's own pages may call: no CORS headers are ever sent.
      if (request.headers.get('origin') !== env.APP_ORIGIN) throw new HttpError(403, 'Not allowed from this site.');
      if ((request.headers.get('content-type') ?? '').startsWith('image/')) throw new HttpError(415, 'Images are never accepted.');
      if (env.RL) {
        const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
        if (!(await env.RL.limit({ key: ip })).success) throw new HttpError(429, 'Slow down a little and try again in a minute.');
      }
      if (url.pathname === '/api/session') {
        countToday(env);
        return json({ token: await makeSession(env), expiresIn: LIMITS.sessionSeconds });
      }
      const route = ROUTES[url.pathname];
      if (!route) throw new HttpError(404, 'No such route.');
      if (!(await checkSession(env, request.headers.get('x-halo-session')))) throw new HttpError(401, 'Start a new session.');
      countToday(env);
      return await route(env, request);
    } catch (err) {
      // Errors carry a plain message only: never the request content.
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      return json({ error: 'Enhanced mode had a problem. Halo keeps working on the phone.' }, 500);
    }
  },
};
