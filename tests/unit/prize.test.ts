import { describe, expect, it } from 'vitest';
import { parseIntro } from '../../src/lib/intro';
import { BUZZ, buzzFor, inQuietHours, outputFor, searchList } from '../../src/lib/rules';
import { makeWhisper } from '../../src/lib/whisper';

const at = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2026, 9, 26, h, m);
};

describe('quiet hours', () => {
  const night = { on: true, from: '22:00', to: '07:00' };
  it('cover a range that crosses midnight', () => {
    expect(inQuietHours(night, at('23:30'))).toBe(true);
    expect(inQuietHours(night, at('02:00'))).toBe(true);
    expect(inQuietHours(night, at('06:59'))).toBe(true);
    expect(inQuietHours(night, at('07:00'))).toBe(false);
    expect(inQuietHours(night, at('12:00'))).toBe(false);
  });
  it('cover a daytime range and do nothing when off or malformed', () => {
    expect(inQuietHours({ on: true, from: '09:00', to: '17:30' }, at('10:00'))).toBe(true);
    expect(inQuietHours({ on: true, from: '09:00', to: '17:30' }, at('18:00'))).toBe(false);
    expect(inQuietHours({ ...night, on: false }, at('23:30'))).toBe(false);
    expect(inQuietHours({ on: true, from: '25:00', to: '07:00' }, at('23:30'))).toBe(false);
  });
});

describe('how a recognised person reaches you', () => {
  const base = { outputMode: 'voice' as const, speakAllowed: true, haptics: true, quietHours: { on: true, from: '22:00', to: '07:00' } };
  it('never says or buzzes a person marked never whisper', () => {
    expect(outputFor({ quiet: true }, base, at('12:00'))).toEqual({ mode: 'silent', reason: 'never' });
  });
  it('turns voice into a buzz in quiet hours, or into nothing when buzzing is off', () => {
    expect(outputFor({}, base, at('23:00'))).toEqual({ mode: 'vibrate', reason: 'quiet-hours' });
    expect(outputFor({}, { ...base, haptics: false }, at('23:00'))).toEqual({ mode: 'silent', reason: 'quiet-hours' });
    expect(outputFor({}, { ...base, outputMode: 'chime' }, at('23:00')).reason).toBe('quiet-hours');
  });
  it('waits for the earbud check before speaking', () => {
    expect(outputFor({}, { ...base, speakAllowed: false }, at('12:00'))).toEqual({ mode: 'vibrate', reason: 'earbud' });
    expect(outputFor({}, base, at('12:00'))).toEqual({ mode: 'voice', reason: null });
  });
  it('uses distinct buzz codes', () => {
    expect(buzzFor(false)).toEqual(BUZZ.known);
    expect(buzzFor(true)).toEqual(BUZZ.today);
    expect(BUZZ.maybe.length).toBe(1);
    expect(new Set([BUZZ.known.length, BUZZ.today.length, BUZZ.maybe.length]).size).toBe(3);
  });
});

describe('event mode', () => {
  const people = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('searches only the people on the list when asked', () => {
    expect(searchList(people, { ids: ['b'], only: true })).toEqual([{ id: 'b' }]);
  });
  it('searches everyone otherwise, or when the list names no one still here', () => {
    expect(searchList(people, { ids: ['b'], only: false })).toHaveLength(3);
    expect(searchList(people, null)).toHaveLength(3);
    expect(searchList(people, { ids: ['gone'], only: true })).toHaveLength(3);
  });
});

describe('spoken enrolment', () => {
  it('splits one sentence into a name, a note, cues and where you met', () => {
    const r = parseIntro('This is Raj, my neighbour, had knee surgery last month, wears a green parka, has round glasses, we met at the climbing gym');
    expect(r.name).toBe('Raj');
    expect(r.note).toBe('This is Raj, my neighbour, had knee surgery last month');
    expect(r.cues.clothes).toBe('Green parka');
    expect(r.cues.glasses).toBe('Round glasses');
    expect(r.met).toBe('At the climbing gym');
    expect(makeWhisper(r.name, r.note)).toBe('Raj, your neighbour. Knee surgery last month.');
  });
  it('handles lower-case speech, hair and "last saw"', () => {
    const r = parseIntro("this is priya, my sister-in-law, she has curly grey hair, last saw her at Anu's wedding");
    expect(r.name).toBe('Priya');
    expect(r.cues.hair).toBe('Curly grey hair');
    expect(r.met).toBe("At Anu's wedding");
    expect(r.note).toBe('this is priya, my sister-in-law');
  });
  it('keeps everything as the note when nothing matches, and never invents a name', () => {
    const r = parseIntro('my old teacher from school');
    expect(r.name).toBe('');
    expect(r.note).toBe('my old teacher from school');
    expect(r.cues).toEqual({});
    expect(r.met).toBe('');
  });
  it('does not mistake words that start with "met" for where you met', () => {
    const r = parseIntro('This is Sam, a metro driver');
    expect(r.met).toBe('');
    expect(r.note).toContain('metro driver');
  });
});

describe('helper cards', () => {
  it('carry a card as text in the fragment and read it back', async () => {
    const { cardLink, readCard } = await import('../../src/lib/cardLink');
    const url = cardLink('https://halo.example', {
      name: 'Raj',
      note: 'Raj, our neighbour, had knee surgery last month',
      cues: { clothes: 'Green parka', hair: '', glasses: 'Round glasses', other: '' },
      met: 'At the summer party',
      by: 'Anu',
    });
    expect(url.startsWith('https://halo.example/app/#/card?d=')).toBe(true);
    const card = readCard(url.split('d=')[1])!;
    expect(card.name).toBe('Raj');
    expect(card.cues).toEqual({ clothes: 'Green parka', glasses: 'Round glasses' });
    expect(card.met).toBe('At the summer party');
    expect(card.by).toBe('Anu');
    expect(JSON.stringify(card)).not.toMatch(/descriptor|thumb|photo|data:image/);
  });
  it('refuse a card without a name or with garbage, and trim long fields', async () => {
    const { cardLink, readCard } = await import('../../src/lib/cardLink');
    expect(readCard('not-base64!')).toBeNull();
    const long = cardLink('https://h', { name: 'A'.repeat(200), note: 'n'.repeat(900), cues: {}, met: 'm'.repeat(400), by: '' });
    const card = readCard(long.split('d=')[1])!;
    expect(card.name.length).toBe(60);
    expect(card.note.length).toBe(300);
    expect(card.met.length).toBe(120);
  });
});
