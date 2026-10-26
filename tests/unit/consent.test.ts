import { describe, expect, it } from 'vitest';
import { answerLink, askLink, readAnswer, readAsk } from '../../src/lib/consentLink';

describe('consent links', () => {
  it('carry the ask in the fragment and read it back', () => {
    const url = askLink('https://halo.example', 'Sam', 'Sam, your teammate. Loves climbing.');
    expect(url.startsWith('https://halo.example/consent/#')).toBe(true);
    const ask = readAsk(new URL(url).hash);
    expect(ask?.name).toBe('Sam');
    expect(ask?.line).toBe('Sam, your teammate. Loves climbing.');
  });

  it('carry the answer back to the app, also in the fragment', () => {
    const url = answerLink('https://halo.example', { name: 'Sam', intro: 'Sam from climbing, call me Sammy', cue: 'Green raincoat' });
    const hash = new URL(url).hash;
    expect(hash.startsWith('#/consent?d=')).toBe(true);
    const answer = readAnswer(hash.split('d=')[1]);
    expect(answer).toMatchObject({ name: 'Sam', intro: 'Sam from climbing, call me Sammy', cue: 'Green raincoat' });
  });

  it('refuse garbage and trim long fields', () => {
    expect(readAsk('#not-base64!!')).toBeNull();
    const url = answerLink('https://h', { name: 'x'.repeat(500), intro: 'y'.repeat(500), cue: 'z'.repeat(500) });
    const a = readAnswer(new URL(url).hash.split('d=')[1])!;
    expect(a.name.length).toBe(60);
    expect(a.intro.length).toBe(200);
    expect(a.cue.length).toBe(80);
  });
});
