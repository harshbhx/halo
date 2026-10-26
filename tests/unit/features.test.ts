import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { cueItems, spokenLine } from '../../src/lib/whisperStyle';
import { addDay, BOX_DAYS, choicesFor, daysThisWeek, duePeople, isoDay, review, roundMessage } from '../../src/lib/practice';
import { BackupError, makeBackup, parseBackup, readBackup } from '../../src/lib/backup';
import { brightness, HintSmoother, pickHint, yawFrom } from '../../src/lib/hints';
import { getMeta, setMeta, wipeVault } from '../../src/lib/vault';
import type { Person } from '../../src/lib/types';

const raj = {
  name: 'Raj',
  whisper: 'Raj, your neighbour. Knee surgery last month.',
  cues: { clothes: 'Green parka', glasses: 'Round glasses' },
};

describe('whisper styles', () => {
  it('short keeps the name and relationship', () => {
    expect(spokenLine(raj, 'short')).toBe('Raj, your neighbour.');
  });
  it('warm adds a friendly opener', () => {
    expect(spokenLine(raj, 'warm')).toBe('That’s Raj, your neighbour. Knee surgery last month.');
  });
  it('full adds what to look for', () => {
    expect(spokenLine(raj, 'full')).toBe('Raj, your neighbour. Knee surgery last month. Look for: Green parka, Round glasses.');
  });
  it('warm copes with an edited whisper that does not start with the name', () => {
    expect(spokenLine({ ...raj, whisper: 'Lives upstairs' }, 'warm')).toBe('That’s Raj. Lives upstairs.');
  });
  it('lists cues in a fixed order with labels', () => {
    expect(cueItems({ glasses: 'Round', clothes: 'Parka', other: '' }).map((c) => c.label)).toEqual(['Usually wears', 'Glasses or accessories']);
  });
});

describe('practice schedule', () => {
  const now = Date.UTC(2026, 9, 26, 12);
  const day = 24 * 3600 * 1000;
  it('moves a named person up a box and into the future', () => {
    const c = review(undefined, true, now);
    expect(c.box).toBe(2);
    expect(c.due).toBe(now + BOX_DAYS[2] * day);
    const c2 = review(c, true, now);
    expect(c2.box).toBe(3);
    expect(c2.due).toBe(now + 3 * day);
  });
  it('brings a missed person back soon without counting it against you', () => {
    const c = review({ box: 4, due: now, seen: 3, named: 3 }, false, now);
    expect(c.box).toBe(1);
    expect(c.named).toBe(3);
    expect(c.due - now).toBeLessThan(day);
  });
  it('picks due people, new ones first', () => {
    const people = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const cards = { a: { box: 2, due: now - 1000, seen: 1, named: 1 }, c: { box: 3, due: now + day, seen: 2, named: 2 } };
    expect(duePeople(people, cards, now).map((p) => p.id)).toEqual(['b', 'a']);
  });
  it('offers the right name among others', () => {
    const people = [
      { id: '1', name: 'Raj' },
      { id: '2', name: 'Maya' },
      { id: '3', name: 'Arjun' },
      { id: '4', name: 'Walter' },
    ];
    const choices = choicesFor(people[0], people, () => 0.3);
    expect(choices).toHaveLength(3);
    expect(choices).toContain('Raj');
    expect(new Set(choices).size).toBe(3);
  });
  it('counts practice days in the last seven days, never resetting harshly', () => {
    let days: string[] = [];
    days = addDay(days, now - 8 * day);
    days = addDay(days, now - 2 * day);
    days = addDay(days, now);
    days = addDay(days, now);
    expect(days).toContain(isoDay(now));
    expect(daysThisWeek(days, now)).toBe(2);
  });
  it('speaks kindly at the end of a round', () => {
    expect(roundMessage(3, 3)).toMatch(/everyone/);
    expect(roundMessage(0, 2)).not.toMatch(/wrong|fail|bad/i);
  });
});

describe('backup files', () => {
  const person: Person = {
    id: 'p1',
    name: 'Raj',
    note: 'neighbour',
    whisper: 'Raj, your neighbour.',
    whisperSource: 'rules',
    cues: {},
    descriptors: [[0.1, 0.2]],
    thumb: '',
    consentAt: '2026-10-26T00:00:00.000Z',
    createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-26T00:00:00.000Z',
  };
  it('round-trips with the right passphrase and hides the content', async () => {
    const file = await makeBackup([person], 'correct horse battery');
    const text = JSON.stringify(file);
    expect(text).not.toContain('Raj');
    const back = await readBackup(parseBackup(text), 'correct horse battery');
    expect(back[0].name).toBe('Raj');
  });
  it('refuses a wrong passphrase', async () => {
    const file = await makeBackup([person], 'correct horse battery');
    await expect(readBackup(file, 'wrong passphrase')).rejects.toBeInstanceOf(BackupError);
  });
  it('refuses a short passphrase and a file that is not a backup', async () => {
    await expect(makeBackup([person], 'short')).rejects.toBeInstanceOf(BackupError);
    expect(() => parseBackup('{"hello":1}')).toThrow(BackupError);
  });
});

describe('camera hints', () => {
  it('measures brightness', () => {
    const dark = new Uint8ClampedArray(400).fill(10);
    expect(brightness(dark)).toBeLessThan(20);
  });
  it('estimates head turn from landmarks', () => {
    expect(yawFrom({ x: 50 }, { x: 40 }, { x: 60 })).toBe(0);
    expect(yawFrom({ x: 60 }, { x: 40 }, { x: 60 })).toBeCloseTo(0.5);
  });
  it('picks the one hint worth showing', () => {
    expect(pickHint({ brightness: 20, unmatched: [], anyFace: false })).toBe('dark');
    expect(pickHint({ brightness: 120, unmatched: [{ widthShare: 0.05, yaw: 0.1 }], anyFace: true })).toBe('far');
    expect(pickHint({ brightness: 120, unmatched: [{ widthShare: 0.3, yaw: 0.6 }], anyFace: true })).toBe('side');
    expect(pickHint({ brightness: 120, unmatched: [{ widthShare: 0.3, yaw: 0.1 }], anyFace: true })).toBeNull();
  });
  it('only shows a hint once it holds for a few frames', () => {
    const s = new HintSmoother(3);
    expect(s.push('far')).toBeNull();
    expect(s.push('far')).toBeNull();
    expect(s.push('far')).toBe('far');
    expect(s.push(null)).toBeNull();
  });
});

describe('encrypted meta records', () => {
  it('stores and reads small values, and wipes them', async () => {
    await wipeVault();
    await setMeta('today', { title: 'Dinner', ids: ['a'], day: '2026-10-26' });
    expect((await getMeta<{ title: string }>('today'))?.title).toBe('Dinner');
    await wipeVault();
    expect(await getMeta('today')).toBeUndefined();
  });
});
