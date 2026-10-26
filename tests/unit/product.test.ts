import { describe, expect, it } from 'vitest';
import { checkPasscode, hashPasscode, validPasscode } from '../../src/lib/lock';
import { suggest, type WrongMatch } from '../../src/lib/reports';

const report = (over: Partial<WrongMatch>): WrongMatch => ({ at: 1, personId: 'a', name: 'Maya', distance: 0.45, runnerUp: 0.6, strictness: 'balanced', ...over });

describe('passcode lock', () => {
  it('keeps only a salted hash and checks codes against it', async () => {
    const stored = await hashPasscode('2468', 1000);
    expect(JSON.stringify(stored)).not.toContain('2468');
    expect(stored.salt).toHaveLength(22);
    expect(await checkPasscode('2468', stored)).toBe(true);
    expect(await checkPasscode('2469', stored)).toBe(false);
    expect(await checkPasscode('2468', { ...stored, hash: undefined })).toBe(false);
  });
  it('gives each passcode its own salt', async () => {
    const a = await hashPasscode('2468', 1000);
    const b = await hashPasscode('2468', 1000);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
  it('accepts 4 to 12 characters', () => {
    expect(validPasscode('123')).toBe(false);
    expect(validPasscode('1234')).toBe(true);
    expect(validPasscode('1'.repeat(13))).toBe(false);
  });
});

describe('wrong-match suggestions', () => {
  it('on Balanced, counts the reports Careful would have kept quiet', () => {
    const tips = suggest([report({ distance: 0.45 }), report({ distance: 0.3, runnerUp: 0.33 }), report({ distance: 0.3, runnerUp: 0.6 })], 'balanced', () => false);
    expect(tips[0]).toEqual({ kind: 'careful', avoided: 2, total: 3 });
  });
  it('suggests new photos after one report and holding at "Could be" after two', () => {
    expect(suggest([report({})], 'careful', () => false)).toEqual([{ kind: 'photos', personId: 'a', name: 'Maya', count: 1 }]);
    expect(suggest([report({}), report({})], 'careful', () => false)).toEqual([{ kind: 'hold', personId: 'a', name: 'Maya', count: 2 }]);
  });
  it('says nothing more about someone already held, or with no reports', () => {
    expect(suggest([report({}), report({})], 'careful', () => true)).toEqual([]);
    expect(suggest([], 'balanced', () => false)).toEqual([]);
  });
});

describe('translations', () => {
  it('Hindi and Gujarati cover every main-flow string and keep the placeholders', async () => {
    const { translate, missingKeys } = await import('../../src/lib/i18n');
    expect(missingKeys('hi')).toEqual([]);
    expect(missingKeys('gu')).toEqual([]);
    const sample = ['tour.count', 'home.lead.many', 'whisper.known.many', 'whisper.couldBe', 'whisper.wrong', 'enrol.hand', 'enrol.hi'] as const;
    for (const lang of ['hi', 'gu'] as const) {
      for (const key of sample) {
        const text = translate(lang, key, { n: 7, name: 'Raj' });
        expect(text, `${lang} ${key}`).not.toBe(translate('en', key, { n: 7, name: 'Raj' }));
        expect(text).toMatch(/7|Raj/);
        expect(text).not.toMatch(/\{\w+\}/);
      }
    }
  });
});
