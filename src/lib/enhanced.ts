/**
 * Enhanced mode, the only code in Halo that talks to a server, and only when the
 * user has turned it on. It sends text (a whisper, a note) and nothing else: no
 * face, photo or face fingerprint ever goes into a request. Every call is written
 * to the privacy ledger. The server is Halo's own Worker on the same origin, so
 * the Content-Security-Policy (connect-src 'self') blocks every other host.
 */
import { record } from './ledger';
import { getSettings } from './settings';

export const WHISPER_LANGUAGES: Array<{ code: string; name: string }> = [
  { code: 'en', name: 'English (no translation)' },
  { code: 'hi', name: 'Hindi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'mr', name: 'Marathi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
];

/** Languages the Worker's natural voice can speak; others use the phone's voice or captions. */
const NATURAL_VOICE_LANGS = new Set(['en', 'es', 'fr']);

const TIMEOUT_MS = 6000;
let session: { token: string; until: number } | null = null;

export function enhancedOn(): boolean {
  return getSettings().enhanced && typeof navigator !== 'undefined' && navigator.onLine;
}

async function call(path: string, init: RequestInit, sent: string, bytes: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let ok = false;
  try {
    const res = await fetch(path, { ...init, method: 'POST', signal: controller.signal, credentials: 'omit', cache: 'no-store' });
    ok = res.ok;
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    await record({ route: path, sent, bytes, ok });
  }
}

async function token(): Promise<string | null> {
  if (session && session.until > Date.now() + 60_000) return session.token;
  const res = await call('/api/session', {}, 'Nothing (asks for a one-hour session)', 0);
  if (!res) return null;
  const body = (await res.json()) as { token: string; expiresIn: number };
  session = { token: body.token, until: Date.now() + body.expiresIn * 1000 };
  return body.token;
}

async function postJson(path: string, body: Record<string, string>, sent: string): Promise<Response | null> {
  if (!enhancedOn()) return null;
  const t = await token();
  if (!t) return null;
  const text = JSON.stringify(body);
  return call(path, { headers: { 'content-type': 'application/json', 'x-halo-session': t }, body: text }, sent, new TextEncoder().encode(text).length);
}

/** A natural voice for one line, as base64 MP3, made once and kept with the person. */
export async function naturalVoice(text: string, lang: string): Promise<string | null> {
  if (!NATURAL_VOICE_LANGS.has(lang)) return null;
  const res = await postJson('/api/voice', { text, lang }, `Whisper text, ${text.length} characters`);
  if (!res) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function translateWhisper(text: string, target: string): Promise<string | null> {
  if (target === 'en') return null;
  const res = await postJson('/api/translate', { text, target }, `Whisper text to translate, ${text.length} characters`);
  if (!res) return null;
  return ((await res.json()) as { text?: string }).text?.trim() || null;
}

export async function cloudWrite(name: string, note: string): Promise<string | null> {
  const res = await postJson('/api/write', { name, note }, `A name and a note, ${name.length + note.length} characters`);
  if (!res) return null;
  return ((await res.json()) as { whisper?: string }).whisper?.trim() || null;
}
