import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deletePerson, getPerson, listPeople, rawRecord, savePerson, wipeVault } from '../../src/lib/vault';
import type { Person } from '../../src/lib/types';

function person(id: string, name: string): Person {
  const now = new Date().toISOString();
  return {
    id,
    name,
    note: `This is ${name}, my neighbour`,
    whisper: `${name}, your neighbour.`,
    whisperSource: 'rules',
    cues: { clothes: 'red scarf' },
    descriptors: [new Array(128).fill(0.1)],
    thumb: 'data:image/jpeg;base64,AAAA',
    consentAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

describe('vault', () => {
  beforeEach(async () => {
    await wipeVault();
  });

  it('saves, lists and reads people back', async () => {
    await savePerson(person('b', 'Bea'));
    await savePerson(person('a', 'Arun'));
    const people = await listPeople();
    expect(people.map((p) => p.name)).toEqual(['Arun', 'Bea']);
    expect((await getPerson('a'))?.cues.clothes).toBe('red scarf');
  });

  it('stores ciphertext, not readable JSON', async () => {
    await savePerson(person('a', 'Arun'));
    const raw = await rawRecord('a');
    expect(raw).toBeDefined();
    const text = new TextDecoder().decode(new Uint8Array(raw!.data));
    expect(text).not.toContain('Arun');
    expect(text).not.toContain('neighbour');
  });

  it('deletes one person', async () => {
    await savePerson(person('a', 'Arun'));
    await savePerson(person('b', 'Bea'));
    await deletePerson('a');
    expect((await listPeople()).map((p) => p.id)).toEqual(['b']);
  });

  it('wipes everything including the key', async () => {
    await savePerson(person('a', 'Arun'));
    await wipeVault();
    expect(await listPeople()).toEqual([]);
  });
});
