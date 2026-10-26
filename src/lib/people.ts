/** Shared, reactive view of the people in the vault. */
import { useSyncExternalStore } from 'react';
import type { Person } from './types';
import * as vault from './vault';

interface PeopleState {
  loaded: boolean;
  people: Person[];
  error: string | null;
}

let state: PeopleState = { loaded: false, people: [], error: null };
const listeners = new Set<() => void>();

function set(next: PeopleState): void {
  state = next;
  listeners.forEach((l) => l());
}

export async function refreshPeople(): Promise<Person[]> {
  try {
    const people = await vault.listPeople();
    set({ loaded: true, people, error: null });
    return people;
  } catch (err) {
    set({ loaded: true, people: [], error: err instanceof Error ? err.message : 'Could not open storage' });
    return [];
  }
}

export async function addOrUpdatePerson(person: Person): Promise<void> {
  await vault.savePerson(person);
  await refreshPeople();
}

export async function removePerson(id: string): Promise<void> {
  await vault.deletePerson(id);
  await refreshPeople();
}

export async function removeEveryone(): Promise<void> {
  await vault.wipeVault();
  set({ loaded: true, people: [], error: null });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!state.loaded) void refreshPeople();
  return () => listeners.delete(listener);
}

function snapshot(): PeopleState {
  return state;
}

export function usePeople(): PeopleState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}
