/**
 * Small reactive stores over the encrypted vault's meta records:
 * today's list (who you expect to see) and practice progress.
 */
import { useSyncExternalStore } from 'react';
import { addDay, review, type PracticeCards } from './practice';
import { getMeta, setMeta } from './vault';

function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next: T) => {
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

/* ---------- Today ---------- */

export interface TodayList {
  title: string;
  ids: string[];
  day: string;
  /** Event mode: Whisper mode compares faces with this list only. */
  only?: boolean;
}

const today = createStore<{ loaded: boolean; list: TodayList | null }>({ loaded: false, list: null });

export async function loadToday(): Promise<void> {
  const list = (await getMeta<TodayList>('today').catch(() => undefined)) ?? null;
  today.set({ loaded: true, list });
}

export async function saveToday(list: TodayList | null): Promise<void> {
  await setMeta('today', list);
  today.set({ loaded: true, list });
}

let todayRequested = false;
function subscribeToday(l: () => void) {
  if (!todayRequested) {
    todayRequested = true;
    void loadToday();
  }
  return today.subscribe(l);
}

export function useToday() {
  return useSyncExternalStore(subscribeToday, today.get, today.get);
}

/* ---------- Practice ---------- */

export interface PracticeState {
  loaded: boolean;
  cards: PracticeCards;
  days: string[];
}

const practice = createStore<PracticeState>({ loaded: false, cards: {}, days: [] });

export async function loadPractice(): Promise<void> {
  const cards = (await getMeta<PracticeCards>('practice').catch(() => undefined)) ?? {};
  const days = (await getMeta<string[]>('practiceDays').catch(() => undefined)) ?? [];
  practice.set({ loaded: true, cards, days });
}

export async function recordAnswer(personId: string, named: boolean, now = Date.now()): Promise<void> {
  const { cards, days } = practice.get();
  const next = { ...cards, [personId]: review(cards[personId], named, now) };
  const nextDays = addDay(days, now);
  practice.set({ loaded: true, cards: next, days: nextDays });
  await setMeta('practice', next);
  await setMeta('practiceDays', nextDays);
}

let practiceRequested = false;
function subscribePractice(l: () => void) {
  if (!practiceRequested) {
    practiceRequested = true;
    void loadPractice();
  }
  return practice.subscribe(l);
}

export function usePractice(): PracticeState {
  return useSyncExternalStore(subscribePractice, practice.get, practice.get);
}

/** After Delete everything, forget what the stores were holding. */
export function resetStores(): void {
  today.set({ loaded: true, list: null });
  practice.set({ loaded: true, cards: {}, days: [] });
}
