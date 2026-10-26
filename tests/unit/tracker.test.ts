import { describe, expect, it } from 'vitest';
import { FaceTracker, STATE_LIMITS, type Observation } from '../../src/lib/matcher';

const box = { x: 100, y: 100, width: 120, height: 120 };
const raj = (distance: number, extra: Partial<Observation> = {}): Observation => ({
  box,
  personId: 'raj',
  distance,
  runnerUp: distance + 0.3,
  frontal: true,
  ...extra,
});

function feed(tracker: FaceTracker, frames: Observation[][], stepMs: number, start = 0) {
  let last: ReturnType<FaceTracker['update']> = [];
  frames.forEach((obs, i) => (last = tracker.update(obs, start + i * stepMs)));
  return last;
}

describe('FaceTracker', () => {
  const limits = STATE_LIMITS.careful;

  it('is only confident after a second and five frames of the same clear match', () => {
    const t = new FaceTracker(limits, 45_000);
    const early = feed(t, Array.from({ length: 4 }, () => [raj(0.2)]), 120);
    expect(early[0].state).not.toBe('confident');
    const later = feed(t, Array.from({ length: 6 }, () => [raj(0.2)]), 120, 480);
    expect(later[0].state).toBe('confident');
    expect(later[0].personId).toBe('raj');
  });

  it('stays at maybe when the margin over the runner-up is small', () => {
    const t = new FaceTracker(limits, 45_000);
    const out = feed(t, Array.from({ length: 12 }, () => [raj(0.3, { runnerUp: 0.34 })]), 120);
    expect(out[0].state).toBe('maybe');
  });

  it('stays at maybe without a frontal frame', () => {
    const t = new FaceTracker(limits, 45_000);
    const out = feed(t, Array.from({ length: 12 }, () => [raj(0.2, { frontal: false })]), 120);
    expect(out[0].state).toBe('maybe');
  });

  it('keeps people marked maybe-only (children) at maybe', () => {
    const t = new FaceTracker(limits, 45_000, (id) => id === 'raj');
    const out = feed(t, Array.from({ length: 12 }, () => [raj(0.2)]), 120);
    expect(out[0].state).toBe('maybe');
  });

  it('calls a far face unsure', () => {
    const t = new FaceTracker(limits, 45_000);
    const out = feed(t, Array.from({ length: 12 }, () => [raj(0.8)]), 120);
    expect(out[0].state).toBe('unsure');
    expect(out[0].personId).toBeNull();
  });

  it('does not let a look-alike flicker make it confident', () => {
    const t = new FaceTracker(limits, 45_000);
    const frames = Array.from({ length: 12 }, (_, i) => [i % 2 ? raj(0.2) : { ...raj(0.25), personId: 'arjun' }]);
    expect(feed(t, frames, 120)[0].state).not.toBe('confident');
  });

  it('follows two faces as two tracks', () => {
    const t = new FaceTracker(limits, 45_000);
    const far = { ...box, x: 400 };
    const out = feed(t, Array.from({ length: 12 }, () => [raj(0.2), { box: far, personId: 'maya', distance: 0.9, runnerUp: 1, frontal: true }]), 120);
    expect(out.map((f) => f.state)).toEqual(['confident', 'unsure']);
    expect(out[0].trackId).not.toBe(out[1].trackId);
  });

  it('starts again when a different face steps into the same spot', () => {
    const t = new FaceTracker(limits, 45_000);
    feed(t, Array.from({ length: 12 }, () => [raj(0.2)]), 120);
    const stranger = { ...raj(0.8), personId: 'raj' };
    const out = feed(t, Array.from({ length: 3 }, () => [stranger]), 120, 1500);
    expect(out[0].state).toBe('unsure');
  });

  it('speaks a person once per repeat interval', () => {
    const t = new FaceTracker(limits, 1000);
    expect(t.shouldSpeak('raj', 0)).toBe(true);
    expect(t.shouldSpeak('raj', 500)).toBe(false);
    expect(t.shouldSpeak('raj', 1500)).toBe(true);
  });
});
