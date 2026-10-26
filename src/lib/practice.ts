/**
 * Practice: gentle spaced recall with your own people.
 *
 * A short Leitner schedule: each person sits in a box from 1 to 5. Naming them
 * moves them up a box and further into the future; missing them brings them
 * back to box 1 for later in the same session. Nothing here ever resets a
 * streak or counts misses against you: the only running number is how many
 * days you practised this week.
 */

export interface PracticeCard {
  box: number; // 1..5
  due: number; // epoch ms
  seen: number;
  named: number;
}

export type PracticeCards = Record<string, PracticeCard>;

const DAY = 24 * 60 * 60 * 1000;
/** Days until the next review, by box. */
export const BOX_DAYS = [0, 0, 1, 3, 7, 14];
export const MAX_BOX = 5;

export function newCard(now: number): PracticeCard {
  return { box: 1, due: now, seen: 0, named: 0 };
}

export function review(card: PracticeCard | undefined, named: boolean, now: number): PracticeCard {
  const current = card ?? newCard(now);
  if (named) {
    const box = Math.min(current.box + 1, MAX_BOX);
    return { box, due: now + BOX_DAYS[box] * DAY, seen: current.seen + 1, named: current.named + 1 };
  }
  // Missed: back to the first box, ready again in a few minutes.
  return { box: 1, due: now + 5 * 60 * 1000, seen: current.seen + 1, named: current.named };
}

/** People due now, never-practised first, then the longest overdue. */
export function duePeople<T extends { id: string }>(people: T[], cards: PracticeCards, now: number, limit = 6): T[] {
  return people
    .filter((p) => (cards[p.id]?.due ?? 0) <= now)
    .sort((a, b) => {
      const ca = cards[a.id];
      const cb = cards[b.id];
      if (!ca && cb) return -1;
      if (ca && !cb) return 1;
      return (ca?.due ?? 0) - (cb?.due ?? 0);
    })
    .slice(0, limit);
}

/** The next time anyone is due, for the "come back" line. */
export function nextDue(people: { id: string }[], cards: PracticeCards, now: number): number | null {
  const times = people.map((p) => cards[p.id]?.due ?? now).filter((t) => t > now);
  return times.length ? Math.min(...times) : null;
}

/** Name choices for one round: the right name and up to two others, shuffled. */
export function choicesFor(target: { id: string; name: string }, people: { id: string; name: string }[], random = Math.random): string[] {
  const others = people.filter((p) => p.id !== target.id && p.name !== target.name).map((p) => p.name);
  const picked: string[] = [];
  const pool = [...new Set(others)];
  while (picked.length < 2 && pool.length) picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  const all = [target.name, ...picked];
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

export function isoDay(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Practice days in the seven days ending today. */
export function daysThisWeek(days: string[], now: number): number {
  const window = new Set(Array.from({ length: 7 }, (_, i) => isoDay(now - i * DAY)));
  return new Set(days.filter((d) => window.has(d))).size;
}

export function addDay(days: string[], now: number): string[] {
  const today = isoDay(now);
  const kept = days.filter((d) => d >= isoDay(now - 30 * DAY));
  return kept.includes(today) ? kept : [...kept, today];
}

/** Kind words for the end of a round. Never a score out of ten, never a scolding. */
export function roundMessage(named: number, total: number): string {
  if (total === 0) return 'Nothing to practise right now.';
  if (named === total) return 'You named everyone. Lovely.';
  if (named === 0) return 'Every round helps, even this one. They’ll come back soon.';
  return `You named ${named} of ${total}. The others will come round again soon.`;
}

export function boxLabel(card: PracticeCard | undefined): string {
  if (!card || card.seen === 0) return 'New to practice';
  if (card.box >= 4) return 'Feels familiar';
  if (card.box >= 2) return 'Getting there';
  return 'Still new';
}
