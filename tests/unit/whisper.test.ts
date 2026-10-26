import { describe, expect, it } from 'vitest';
import { cueLine, makeWhisper } from '../../src/lib/whisper';

describe('makeWhisper', () => {
  it('turns the Raj note into a short second-person whisper', () => {
    expect(makeWhisper('Raj', 'This is Raj, my neighbour, had knee surgery last month')).toBe(
      'Raj, your neighbour. Knee surgery last month.',
    );
  });

  it('works when the name is not in the note', () => {
    expect(makeWhisper('Sam', 'my teammate from the hackathon, likes climbing')).toBe(
      'Sam, your teammate from the hackathon. Likes climbing.',
    );
  });

  it('swaps we and I for you', () => {
    expect(makeWhisper('Priya', "We met at Anna's wedding. I owe her a call")).toBe(
      "Priya. You met at Anna's wedding. You owe her a call.",
    );
  });

  it('drops he/she and leading verbs', () => {
    expect(makeWhisper('Tom', 'Tom is my manager. He has two kids. She is vegan')).toBe(
      'Tom, your manager. Two kids. Vegan.',
    );
  });

  it('keeps meaningful verbs', () => {
    expect(makeWhisper('Lena', "that's Lena, works at the bakery on 5th, has been ill")).toBe(
      'Lena. Works at the bakery on 5th. Has been ill.',
    );
  });

  it('handles curly apostrophes and extra spaces', () => {
    expect(makeWhisper('Ana', '  this is Ana ,  my cousin’s wife  ')).toBe("Ana, your cousin's wife.");
  });

  it('falls back to the name for an empty note', () => {
    expect(makeWhisper('Kim', '')).toBe('Kim.');
    expect(makeWhisper('Kim', '   ')).toBe('Kim.');
  });

  it('keeps whispers short', () => {
    const long =
      'my old friend from school, we used to play football every weekend in the park near the river, now a doctor in the city hospital, loves jazz, has a dog called Max, moved here in spring';
    const whisper = makeWhisper('Ben', long);
    expect(whisper.startsWith('Ben, your old friend from school.')).toBe(true);
    expect(whisper.split(' ').length).toBeLessThanOrEqual(22);
  });
});

describe('demo whispers (quoted in DEMO.md)', () => {
  it('writes the sample people whispers', () => {
    expect(makeWhisper('Maya', 'This is Maya, my manager at work, just back from parental leave')).toBe(
      'Maya, your manager at work. Just back from parental leave.',
    );
    expect(makeWhisper('Arjun', 'Arjun, my neighbour from flat 4, had knee surgery last month')).toBe(
      'Arjun, your neighbour from flat 4. Knee surgery last month.',
    );
    expect(makeWhisper('Walter', 'This is Walter, my piano teacher, his daughter just got married')).toBe(
      'Walter, your piano teacher. His daughter just got married.',
    );
  });
});

describe('cueLine', () => {
  it('joins the filled cues', () => {
    expect(cueLine({ clothes: 'green parka', hair: '', glasses: 'round glasses' })).toBe('green parka · round glasses');
  });
});
