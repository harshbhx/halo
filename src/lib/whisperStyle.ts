/**
 * How a whisper is spoken. The stored whisper is one line; the style decides
 * how much of it (and of the cue notes) the voice says.
 *
 *   short  "Raj, your neighbour."
 *   warm   "That's Raj, your neighbour. Knee surgery last month."
 *   full   "Raj, your neighbour. Knee surgery last month. Look for: green parka, round glasses."
 */
import type { Cues } from './types';

export type WhisperStyle = 'short' | 'warm' | 'full';

export const STYLE_LABELS: Record<WhisperStyle, { name: string; hint: string }> = {
  short: { name: 'Short', hint: 'Just the name and how you know them' },
  warm: { name: 'Warm', hint: 'A friendly "That’s" and the whole line' },
  full: { name: 'Full', hint: 'The whole line and what to look for' },
};

export interface CueItem {
  kind: keyof Cues;
  label: string;
  text: string;
}

const CUE_ORDER: Array<[keyof Cues, string]> = [
  ['clothes', 'Usually wears'],
  ['hair', 'Hair'],
  ['glasses', 'Glasses or accessories'],
  ['other', 'Also'],
];

export function cueItems(cues: Cues): CueItem[] {
  return CUE_ORDER.flatMap(([kind, label]) => {
    const text = (cues[kind] ?? '').trim();
    return text ? [{ kind, label, text }] : [];
  });
}

function firstSentence(text: string): string {
  const match = /^(.+?[.!?])(\s|$)/.exec(text.trim());
  return (match ? match[1] : text.trim()).trim();
}

function ensureStop(text: string): string {
  const t = text.trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function lowerFirst(text: string, name: string): string {
  // Keep the name's own capitals; only soften a leading common word.
  if (text.startsWith(name)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function spokenLine(person: { name: string; whisper: string; cues: Cues }, style: WhisperStyle): string {
  const whisper = ensureStop(person.whisper || person.name);
  switch (style) {
    case 'short':
      return firstSentence(whisper);
    case 'warm': {
      const body = whisper.startsWith(person.name) ? whisper : `${person.name}. ${whisper}`;
      return `That’s ${lowerFirst(body, person.name)}`;
    }
    case 'full': {
      const items = cueItems(person.cues).map((c) => c.text);
      if (items.length === 0) return whisper;
      return `${whisper} Look for: ${items.join(', ')}.`;
    }
  }
}
