import { describe, expect, it } from 'vitest';
import { bestMatch, euclidean, resolveFrame, THRESHOLDS, Tracker, type Enrolled } from '../../src/lib/matcher';

function vec(...values: number[]): number[] {
  const v = new Array(128).fill(0);
  values.forEach((value, i) => (v[i] = value));
  return v;
}

const raj: Enrolled = { id: 'raj', descriptors: [vec(1, 0), vec(0.95, 0.05)] };
const sam: Enrolled = { id: 'sam', descriptors: [vec(0, 1)] };

describe('euclidean', () => {
  it('measures distance', () => {
    expect(euclidean(vec(3, 4), vec(0, 0))).toBeCloseTo(5);
  });
});

describe('bestMatch', () => {
  it('matches the closest person under the threshold', () => {
    const m = bestMatch(vec(0.97, 0.1), [raj, sam], THRESHOLDS.careful);
    expect(m.personId).toBe('raj');
    expect(m.distance).toBeLessThan(0.1);
  });

  it('leaves a far face unknown', () => {
    const m = bestMatch(vec(-1, -1), [raj, sam], THRESHOLDS.balanced);
    expect(m.personId).toBeNull();
  });

  it('leaves an ambiguous face unknown', () => {
    const a: Enrolled = { id: 'a', descriptors: [vec(0.2, 0)] };
    const b: Enrolled = { id: 'b', descriptors: [vec(0, 0.2)] };
    const m = bestMatch(vec(0.1, 0.1), [a, b], THRESHOLDS.balanced);
    expect(m.personId).toBeNull();
  });

  it('returns unknown when nobody is enrolled', () => {
    expect(bestMatch(vec(1), [], THRESHOLDS.careful).personId).toBeNull();
  });
});

describe('resolveFrame', () => {
  it('keeps only the closest face for each person', () => {
    const faces = resolveFrame([
      { match: { personId: 'raj', distance: 0.3, runnerUp: 1 } },
      { match: { personId: 'raj', distance: 0.2, runnerUp: 1 } },
    ]);
    expect(faces.map((f) => f.match.personId)).toEqual([null, 'raj']);
  });
});

describe('Tracker', () => {
  it('needs a steady match before confirming and speaking', () => {
    const t = new Tracker({ need: 3, window: 4, cooldownMs: 45_000 });
    expect(t.update(['raj'], 0).confirmed.has('raj')).toBe(false);
    expect(t.update(['raj'], 100).confirmed.has('raj')).toBe(false);
    const third = t.update(['raj'], 200);
    expect(third.confirmed.has('raj')).toBe(true);
    expect(third.toSpeak).toEqual(['raj']);
  });

  it('does not repeat within the cool-down', () => {
    const t = new Tracker({ need: 1, window: 1, cooldownMs: 1000 });
    expect(t.update(['raj'], 0).toSpeak).toEqual(['raj']);
    expect(t.update(['raj'], 500).toSpeak).toEqual([]);
    expect(t.update(['raj'], 1500).toSpeak).toEqual(['raj']);
  });

  it('drops the ring as soon as the person leaves the frame', () => {
    const t = new Tracker({ need: 2, window: 4, cooldownMs: 1000 });
    t.update(['raj'], 0);
    t.update(['raj'], 1);
    expect(t.update([], 2).confirmed.size).toBe(0);
  });

  it('ignores a single flicker', () => {
    const t = new Tracker({ need: 3, window: 4, cooldownMs: 1000 });
    t.update(['sam'], 0);
    t.update([], 1);
    t.update([], 2);
    expect(t.update(['sam'], 3).confirmed.size).toBe(0);
  });

  it('can forget a cool-down so a tap repeats the whisper', () => {
    const t = new Tracker({ need: 1, window: 1, cooldownMs: 60_000 });
    t.update(['raj'], 0);
    t.forget('raj');
    expect(t.update(['raj'], 10).toSpeak).toEqual(['raj']);
  });
});
