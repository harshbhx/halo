/**
 * Face matching and the "steady before speaking" rule.
 *
 * A face fingerprint (descriptor) is 128 numbers. Two shots of the same person
 * are close together (small Euclidean distance); different people are further
 * apart. A face only counts as a match when it is closer than the threshold to
 * one enrolled person AND clearly closer to them than to anyone else.
 */

export type Strictness = 'careful' | 'balanced';

export const THRESHOLDS: Record<Strictness, number> = {
  careful: 0.45,
  balanced: 0.52,
};

/** How much closer the best person must be than the runner-up. */
export const AMBIGUITY_MARGIN = 0.04;

export interface Enrolled {
  id: string;
  descriptors: ArrayLike<number>[];
}

export interface Match {
  personId: string | null;
  distance: number;
  runnerUp: number;
}

export function euclidean(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length) throw new Error('Descriptor lengths differ');
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function personDistance(descriptor: ArrayLike<number>, person: Enrolled): number {
  let best = Infinity;
  for (const known of person.descriptors) best = Math.min(best, euclidean(descriptor, known));
  return best;
}

export function bestMatch(
  descriptor: ArrayLike<number>,
  people: Enrolled[],
  threshold: number,
  margin = AMBIGUITY_MARGIN,
): Match {
  let best = Infinity;
  let runnerUp = Infinity;
  let bestId: string | null = null;
  for (const person of people) {
    const d = personDistance(descriptor, person);
    if (d < best) {
      runnerUp = best;
      best = d;
      bestId = person.id;
    } else if (d < runnerUp) {
      runnerUp = d;
    }
  }
  const clear = runnerUp - best >= margin;
  return {
    personId: bestId !== null && best < threshold && clear ? bestId : null,
    distance: best,
    runnerUp,
  };
}

/**
 * Several faces in one frame can't all be the same person: keep the closest
 * face for each person and mark the others unknown.
 */
export function resolveFrame<T extends { match: Match }>(faces: T[]): T[] {
  const closest = new Map<string, number>();
  faces.forEach((face, index) => {
    const id = face.match.personId;
    if (!id) return;
    const current = closest.get(id);
    if (current === undefined || faces[current].match.distance > face.match.distance) closest.set(id, index);
  });
  return faces.map((face, index) => {
    const id = face.match.personId;
    if (id && closest.get(id) !== index) return { ...face, match: { ...face.match, personId: null } };
    return face;
  });
}

export interface TrackerOptions {
  /** Frames (out of `window`) a person must be matched in before confirming. */
  need: number;
  window: number;
  /** Don't whisper the same person again within this time. */
  cooldownMs: number;
}

export interface TrackerUpdate {
  confirmed: Set<string>;
  toSpeak: string[];
}

export class Tracker {
  private history: Set<string>[] = [];
  private lastSpoken = new Map<string, number>();

  constructor(private options: TrackerOptions) {}

  setCooldown(ms: number): void {
    this.options = { ...this.options, cooldownMs: ms };
  }

  update(matchedIds: Iterable<string>, now: number): TrackerUpdate {
    this.history.push(new Set(matchedIds));
    if (this.history.length > this.options.window) this.history.shift();

    const counts = new Map<string, number>();
    for (const frame of this.history) for (const id of frame) counts.set(id, (counts.get(id) ?? 0) + 1);

    const confirmed = new Set<string>();
    const toSpeak: string[] = [];
    for (const [id, count] of counts) {
      if (count < this.options.need) continue;
      // Only confirm people present in the latest frame, so rings vanish when they leave.
      if (!this.history[this.history.length - 1].has(id)) continue;
      confirmed.add(id);
      const last = this.lastSpoken.get(id);
      if (last === undefined || now - last >= this.options.cooldownMs) {
        this.lastSpoken.set(id, now);
        toSpeak.push(id);
      }
    }
    return { confirmed, toSpeak };
  }

  /** Let a person be whispered again straight away (e.g. after the user taps the caption). */
  forget(id: string): void {
    this.lastSpoken.delete(id);
  }

  reset(): void {
    this.history = [];
    this.lastSpoken.clear();
  }
}
