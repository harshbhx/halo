/**
 * Small rules that decide how (and whether) a recognised person reaches you:
 * quiet hours, people you never want whispered, the earbud check, pocket mode's
 * buzz codes, and event mode's short list. Pure functions, unit tested.
 */
import type { OutputMode, QuietHours, Settings } from './settings';
import type { Person } from './types';

/**
 * Buzz codes for pocket mode and buzz output, so a whisper can be felt without looking:
 * someone you know: two short; someone on today's list: three short; "could be": one long.
 */
export const BUZZ = {
  known: [60, 90, 60],
  today: [60, 90, 60, 90, 60],
  maybe: [260],
} as const;

export const BUZZ_LABELS: Array<{ code: keyof typeof BUZZ; label: string }> = [
  { code: 'known', label: 'Two short: someone you added' },
  { code: 'today', label: 'Three short: someone on today’s list' },
  { code: 'maybe', label: 'One long: could be someone you know' },
];

function minutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Whether `now` (local time) falls inside quiet hours. Ranges may cross midnight (22:00 to 07:00). */
export function inQuietHours(q: QuietHours, now: Date): boolean {
  if (!q.on) return false;
  const from = minutes(q.from);
  const to = minutes(q.to);
  if (from === null || to === null || from === to) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return from < to ? t >= from && t < to : t >= from || t < to;
}

export type Reason = 'never' | 'quiet-hours' | 'earbud' | null;

export interface Output {
  mode: OutputMode;
  /** Why it isn't spoken aloud, when it isn't. */
  reason: Reason;
}

/**
 * How a confident recognition reaches you. A person marked "never whisper" is
 * shown on screen only. In quiet hours and before the earbud check, voice
 * becomes a buzz (or nothing, if buzzing is off). Otherwise the chosen output.
 */
export function outputFor(
  person: Pick<Person, 'quiet'>,
  s: Pick<Settings, 'outputMode' | 'speakAllowed' | 'quietHours' | 'haptics'>,
  now: Date,
): Output {
  if (person.quiet) return { mode: 'silent', reason: 'never' };
  const fallback: OutputMode = s.haptics ? 'vibrate' : 'silent';
  const aloud = s.outputMode === 'voice' || s.outputMode === 'chime';
  if (aloud && inQuietHours(s.quietHours, now)) return { mode: fallback, reason: 'quiet-hours' };
  if (s.outputMode === 'voice' && !s.speakAllowed) return { mode: fallback, reason: 'earbud' };
  return { mode: s.outputMode, reason: null };
}

/** The buzz code for someone recognised. */
export function buzzFor(onToday: boolean): readonly number[] {
  return onToday ? BUZZ.today : BUZZ.known;
}

/**
 * Event mode: when today's list is set to "only these people", Whisper mode
 * compares faces with that short list alone. Everyone else, even people you
 * added, gets "No match" until the event is over.
 */
export function searchList<T extends { id: string }>(people: T[], today: { ids: string[]; only?: boolean } | null | undefined): T[] {
  if (!today?.only || today.ids.length === 0) return people;
  const ids = new Set(today.ids);
  const chosen = people.filter((p) => ids.has(p.id));
  return chosen.length > 0 ? chosen : people;
}
