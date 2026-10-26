/**
 * Consent by link, for when the person isn't standing next to you. Everything
 * travels in the URL fragment (after #), which browsers never send to a server:
 * your phone makes a link, they read it on their phone and answer, and their
 * answer comes back to you as another link. No faces are involved.
 */

export interface ConsentAsk {
  v: 1;
  name: string;
  line: string;
  at: string;
}

export interface ConsentAnswer {
  v: 1;
  name: string;
  intro: string;
  cue: string;
  at: string;
}

export function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decode<T>(text: string): T | null {
  try {
    const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
    const s = atob(b64 + '==='.slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(s, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '');

export function askLink(origin: string, name: string, line: string): string {
  const ask: ConsentAsk = { v: 1, name: name.slice(0, 60), line: line.slice(0, 200), at: new Date().toISOString() };
  return `${origin}/consent/#${encode(ask)}`;
}

export function readAsk(fragment: string): ConsentAsk | null {
  const a = decode<ConsentAsk>(fragment.replace(/^#/, ''));
  if (!a || a.v !== 1) return null;
  return { v: 1, name: clip(a.name, 60), line: clip(a.line, 200), at: clip(a.at, 40) };
}

export function answerLink(origin: string, answer: Omit<ConsentAnswer, 'v' | 'at'>): string {
  const full: ConsentAnswer = { v: 1, name: answer.name.slice(0, 60), intro: answer.intro.slice(0, 200), cue: answer.cue.slice(0, 80), at: new Date().toISOString() };
  return `${origin}/app/#/consent?d=${encode(full)}`;
}

export function readAnswer(param: string): ConsentAnswer | null {
  const a = decode<ConsentAnswer>(param);
  if (!a || a.v !== 1 || !a.name) return null;
  return { v: 1, name: clip(a.name, 60), intro: clip(a.intro, 200), cue: clip(a.cue, 80), at: clip(a.at, 40) };
}

/** A consent answer waiting to start an enrolment (memory only). */
let pending: ConsentAnswer | null = null;
export function setPendingConsent(a: ConsentAnswer | null): void {
  pending = a;
}
export function takePendingConsent(): ConsentAnswer | null {
  const a = pending;
  pending = null;
  return a;
}

/** Share a link with the system share sheet, or copy it. */
export async function shareLink(url: string, title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return 'shared';
    }
  } catch {
    // fall through to copying
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
