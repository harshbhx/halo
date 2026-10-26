import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { checkSession, makeSession, MODELS, resetCounter, type Env } from '../../worker/index';

const ORIGIN = 'https://halo.dualmindlab.tech';

function env(overrides: Partial<Env> = {}): Env {
  return {
    APP_ORIGIN: ORIGIN,
    SESSION_SECRET: 'test-secret-not-real',
    DAILY_LIMIT: '1000',
    AI: {
      run: vi.fn(async (model: string, input: Record<string, unknown>) => {
        if (model === MODELS.voice) return { audio: btoa('ID3fake-mp3') };
        if (model === MODELS.indic) return { translations: [`hi:${(input.text as string[])[0]}`] };
        if (model === MODELS.m2m) return { translated_text: `es:${input.text}` };
        if (model === MODELS.write) return { response: 'Raj, your neighbour. Knee surgery last month' };
        if (model === MODELS.transcribe) return { text: 'This is Raj, my neighbour' };
        throw new Error('unknown model');
      }),
    },
    ...overrides,
  };
}

async function session(e: Env) {
  const res = await worker.fetch(new Request(`${ORIGIN}/api/session`, { method: 'POST', headers: { origin: ORIGIN } }), e);
  return ((await res.json()) as { token: string }).token;
}

function post(path: string, body: unknown, token: string | null, headers: Record<string, string> = {}) {
  const isBytes = body instanceof Uint8Array;
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'content-type': isBytes ? 'audio/webm' : 'application/json',
      ...(token ? { 'x-halo-session': token } : {}),
      ...headers,
    },
    body: isBytes ? (body.slice().buffer as ArrayBuffer) : JSON.stringify(body),
  });
}

describe('Enhanced mode Worker', () => {
  beforeEach(() => resetCounter());
  afterEach(() => vi.restoreAllMocks());

  it('makes and checks one-hour session tokens', async () => {
    const e = env();
    const token = await makeSession(e, 0);
    expect(await checkSession(e, token, 1000)).toBe(true);
    expect(await checkSession(e, token, 3_700_000)).toBe(false);
    expect(await checkSession(e, token.replace(/.$/, 'x'), 1000)).toBe(false);
  });

  it('turns whisper text into audio', async () => {
    const e = env();
    const res = await worker.fetch(post('/api/voice', { text: 'Raj, your neighbour.', lang: 'en' }, await session(e)), e);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/mpeg');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('translates to Indian languages with IndicTrans2 and others with m2m100', async () => {
    const e = env();
    const token = await session(e);
    const hi = await worker.fetch(post('/api/translate', { text: 'Raj, your neighbour.', target: 'hi' }, token), e);
    expect(await hi.json()).toEqual({ text: 'hi:Raj, your neighbour.' });
    const es = await worker.fetch(post('/api/translate', { text: 'Raj, your neighbour.', target: 'es' }, token), e);
    expect(await es.json()).toEqual({ text: 'es:Raj, your neighbour.' });
  });

  it('writes a whisper from a note and transcribes a short voice note', async () => {
    const e = env();
    const token = await session(e);
    const w = await worker.fetch(post('/api/write', { name: 'Raj', note: 'my neighbour, knee surgery last month' }, token), e);
    expect(await w.json()).toEqual({ whisper: 'Raj, your neighbour. Knee surgery last month.' });
    const t = await worker.fetch(post('/api/transcribe', new Uint8Array([1, 2, 3]), token), e);
    expect(await t.json()).toEqual({ text: 'This is Raj, my neighbour' });
  });

  it('refuses other origins, missing sessions, extra fields, images and oversize input', async () => {
    const e = env();
    const token = await session(e);
    expect((await worker.fetch(post('/api/voice', { text: 'x' }, token, { origin: 'https://evil.example' }), e)).status).toBe(403);
    expect((await worker.fetch(post('/api/voice', { text: 'x' }, null), e)).status).toBe(401);
    expect((await worker.fetch(post('/api/voice', { text: 'x', face: [0.1] }, token), e)).status).toBe(400);
    expect((await worker.fetch(post('/api/voice', { text: 'x'.repeat(201) }, token), e)).status).toBe(413);
    expect((await worker.fetch(post('/api/transcribe', new Uint8Array(10), token, { 'content-type': 'image/jpeg' }), e)).status).toBe(415);
    expect((await worker.fetch(new Request(`${ORIGIN}/api/voice`, { method: 'GET', headers: { origin: ORIGIN } }), e)).status).toBe(405);
  });

  it('rate limits per address and stops at the daily ceiling', async () => {
    const limited = env({ RL: { limit: async () => ({ success: false }) } });
    expect((await worker.fetch(post('/api/voice', { text: 'x' }, await makeSession(limited)), limited)).status).toBe(429);
    const small = env({ DAILY_LIMIT: '2' });
    const token = await session(small); // 1
    expect((await worker.fetch(post('/api/voice', { text: 'x' }, token), small)).status).toBe(200); // 2
    expect((await worker.fetch(post('/api/voice', { text: 'x' }, token), small)).status).toBe(429);
  });

  it('never logs what was sent and never sends CORS headers', async () => {
    const log = vi.spyOn(console, 'log');
    const errors = vi.spyOn(console, 'error');
    const e = env();
    const res = await worker.fetch(post('/api/write', { name: 'Raj', note: 'knee surgery' }, await session(e)), e);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect(log).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });

  it('answers gracefully when the AI service fails', async () => {
    const e = env({ AI: { run: async () => ({}) } });
    const res = await worker.fetch(post('/api/translate', { text: 'Raj', target: 'gu' }, await session(e)), e);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toMatch(/English/);
  });
});
