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

/* ---------- Three states on one tracked face ---------- */

/**
 * A wrong name is worse than silence, so each face in view is followed across
 * frames and given one of three states:
 *
 *   confident  the same person, clearly closer than anyone else, for at least a
 *              second and five frames including a frontal one. Only this speaks.
 *   maybe      probably someone you know, not yet sure. Shown quietly as
 *              "Could be Raj?" with a cue to check. Never spoken.
 *   unsure     no match. Silence doesn't mean a stranger.
 */
export type FaceState = 'confident' | 'maybe' | 'unsure';

export interface StateLimits {
  confident: number; // distance under which a frame counts toward confident
  maybe: number; // distance under which a frame counts toward maybe
  margin: number; // how much closer than the runner-up a confident frame must be
  minFrames: number;
  minMs: number;
}

export const STATE_LIMITS: Record<Strictness, StateLimits> = {
  careful: { confident: 0.42, maybe: 0.5, margin: 0.08, minFrames: 5, minMs: 1000 },
  balanced: { confident: 0.47, maybe: 0.55, margin: 0.08, minFrames: 5, minMs: 900 },
};

/** The nearest enrolled person, whatever the distance (the tracker applies the limits). */
export function nearest(descriptor: ArrayLike<number>, people: Enrolled[]): Match {
  return bestMatch(descriptor, people, Infinity, 0);
}

export interface Observation {
  box: { x: number; y: number; width: number; height: number };
  personId: string | null; // the nearest person
  distance: number;
  runnerUp: number;
  frontal: boolean;
}

interface Sample extends Observation {
  t: number;
}

interface Track {
  id: number;
  box: Observation['box'];
  samples: Sample[];
  lastSeen: number;
  /** Frames in a row that disagree with who this track has been. */
  mismatch: number;
}

export interface TrackedFace {
  trackId: number;
  box: Observation['box'];
  state: FaceState;
  personId: string | null;
  distance: number;
}

function iou(a: Observation['box'], b: Observation['box']): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

export function stateOf(samples: Sample[], now: number, limits: StateLimits, maybeOnly: (id: string) => boolean): { state: FaceState; personId: string | null; distance: number } {
  const recent = samples.filter((s) => now - s.t <= limits.minMs + 400);
  if (recent.length === 0) return { state: 'unsure', personId: null, distance: Infinity };
  // The person most of the recent frames point at.
  const votes = new Map<string, number>();
  for (const s of recent) if (s.personId && s.distance < limits.maybe) votes.set(s.personId, (votes.get(s.personId) ?? 0) + 1);
  let candidate: string | null = null;
  let best = 0;
  for (const [id, n] of votes) if (n > best) [candidate, best] = [id, n];
  if (!candidate) return { state: 'unsure', personId: null, distance: Math.min(...recent.map((s) => s.distance)) };
  const mine = recent.filter((s) => s.personId === candidate);
  const distance = mine.map((s) => s.distance).sort((a, b) => a - b)[Math.floor(mine.length / 2)];

  const window = recent.filter((s) => now - s.t <= limits.minMs + 400);
  const span = window.length ? now - window[0].t : 0;
  const strong = window.filter((s) => s.personId === candidate && s.distance < limits.confident && s.runnerUp - s.distance >= limits.margin);
  const steady = window.length >= limits.minFrames && span >= limits.minMs && strong.length >= Math.ceil(window.length * 0.8);
  const frontal = strong.some((s) => s.frontal);
  const disputed = window.some((s) => s.personId !== candidate && s.distance < limits.confident);
  if (steady && frontal && !disputed && !maybeOnly(candidate)) return { state: 'confident', personId: candidate, distance };
  if (best >= 2 || mine.some((s) => s.distance < limits.confident)) return { state: 'maybe', personId: candidate, distance };
  return { state: 'unsure', personId: null, distance };
}

export class FaceTracker {
  private tracks: Track[] = [];
  private nextId = 1;
  private lastSpoken = new Map<string, number>();

  constructor(
    private limits: StateLimits,
    private cooldownMs: number,
    private maybeOnly: (personId: string) => boolean = () => false,
  ) {}

  configure(limits: StateLimits, cooldownMs: number, maybeOnly?: (personId: string) => boolean): void {
    this.limits = limits;
    this.cooldownMs = cooldownMs;
    if (maybeOnly) this.maybeOnly = maybeOnly;
  }

  /** Feed one frame's faces; get each tracked face's state back. */
  update(observations: Observation[], now: number): TrackedFace[] {
    const unused = new Set(this.tracks.map((t) => t.id));
    const out: TrackedFace[] = [];
    for (const obs of observations) {
      let best: Track | null = null;
      let bestOverlap = 0.25;
      for (const t of this.tracks) {
        if (!unused.has(t.id)) continue;
        const o = iou(t.box, obs.box);
        if (o > bestOverlap) [best, bestOverlap] = [t, o];
      }
      const track = best ?? { id: this.nextId++, box: obs.box, samples: [], lastSeen: now, mismatch: 0 };
      if (!best) this.tracks.push(track);
      unused.delete(track.id);
      track.box = obs.box;
      track.lastSeen = now;
      // A different face can step into the same spot. If two frames in a row disagree with
      // who this track has been, its history is dropped and it starts again from nothing.
      const before = stateOf(track.samples, now, this.limits, this.maybeOnly);
      const agrees = !before.personId || (obs.personId === before.personId && obs.distance < this.limits.maybe);
      track.mismatch = agrees ? 0 : track.mismatch + 1;
      if (track.mismatch >= 2) {
        track.samples = track.samples.slice(-1);
        track.mismatch = 0;
      }
      track.samples.push({ ...obs, t: now });
      track.samples = track.samples.filter((s) => now - s.t <= 2500);
      let s = stateOf(track.samples, now, this.limits, this.maybeOnly);
      // While this frame disagrees with the track's history, never claim the old person.
      if (track.mismatch > 0) {
        s =
          obs.personId && obs.distance < this.limits.maybe
            ? { state: 'maybe', personId: obs.personId, distance: obs.distance }
            : { state: 'unsure', personId: null, distance: obs.distance };
      }
      out.push({ trackId: track.id, box: obs.box, ...s });
    }
    // A face that has left the view is forgotten at once.
    this.tracks = this.tracks.filter((t) => !unused.has(t.id) || now - t.lastSeen < 600);
    return out;
  }

  /** Whether to whisper this person now (confident and outside the repeat interval). */
  shouldSpeak(personId: string, now: number): boolean {
    const last = this.lastSpoken.get(personId);
    if (last !== undefined && now - last < this.cooldownMs) return false;
    this.lastSpoken.set(personId, now);
    return true;
  }

  forget(personId: string): void {
    this.lastSpoken.delete(personId);
  }

  reset(): void {
    this.tracks = [];
    this.lastSpoken.clear();
  }
}
