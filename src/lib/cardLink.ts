/**
 * A helper card: a trusted person (a partner, a parent, a friend) prepares who
 * someone is and how you know them, on their own phone, and sends it to you as
 * a link. Text only, in the URL fragment, which browsers never send to a server.
 * No photos and no face fingerprints: those are taken on your phone, in person,
 * after the person being added has read their line and said yes.
 */
import { decode, encode } from './consentLink';
import type { Cues } from './types';

export interface HelperCard {
  v: 1;
  name: string;
  note: string;
  cues: Cues;
  met: string;
  /** The helper's first name, so you know who prepared it. Optional. */
  by: string;
  at: string;
}

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.trim().slice(0, n) : '');

function cleanCues(c: unknown): Cues {
  const src = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
  const out: Cues = {};
  for (const key of ['clothes', 'hair', 'glasses', 'other'] as const) {
    const v = clip(src[key], 80);
    if (v) out[key] = v;
  }
  return out;
}

export function cardLink(origin: string, card: Omit<HelperCard, 'v' | 'at'>): string {
  const full: HelperCard = {
    v: 1,
    name: clip(card.name, 60),
    note: clip(card.note, 300),
    cues: cleanCues(card.cues),
    met: clip(card.met, 120),
    by: clip(card.by, 40),
    at: new Date().toISOString(),
  };
  return `${origin}/app/#/card?d=${encode(full)}`;
}

export function readCard(param: string): HelperCard | null {
  const c = decode<HelperCard>(param);
  if (!c || c.v !== 1 || !clip(c.name, 60)) return null;
  return { v: 1, name: clip(c.name, 60), note: clip(c.note, 300), cues: cleanCues(c.cues), met: clip(c.met, 120), by: clip(c.by, 40), at: clip(c.at, 40) };
}

export function helperLink(origin: string): string {
  return `${origin}/helper/`;
}

/** A card waiting to start an enrolment (memory only). */
let pending: HelperCard | null = null;
export function setPendingCard(c: HelperCard | null): void {
  pending = c;
}
export function takePendingCard(): HelperCard | null {
  const c = pending;
  pending = null;
  return c;
}
