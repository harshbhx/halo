/**
 * The privacy ledger: every request Halo makes with your data, what was in it,
 * and the running count of faces sent (always zero). Kept encrypted on the phone.
 * In the default mode nothing is ever added: only Enhanced mode makes requests.
 */
import { useSyncExternalStore } from 'react';
import { getMeta, setMeta } from './vault';

export interface LedgerEntry {
  id: string;
  at: string;
  route: string;
  /** Plain words for what left the phone, e.g. "Whisper text, 46 characters". */
  sent: string;
  bytes: number;
  ok: boolean;
}

const KEY = 'ledger';
const MAX = 200;
let state: { loaded: boolean; entries: LedgerEntry[] } = { loaded: false, entries: [] };
const listeners = new Set<() => void>();
let requested = false;

function set(next: typeof state) {
  state = next;
  listeners.forEach((l) => l());
}

export async function loadLedger(): Promise<void> {
  const entries = (await getMeta<LedgerEntry[]>(KEY).catch(() => undefined)) ?? [];
  set({ loaded: true, entries });
}

export async function record(entry: Omit<LedgerEntry, 'id' | 'at'>): Promise<void> {
  if (!state.loaded) await loadLedger();
  const full: LedgerEntry = { ...entry, id: Math.random().toString(36).slice(2), at: new Date().toISOString() };
  const entries = [full, ...state.entries].slice(0, MAX);
  set({ loaded: true, entries });
  await setMeta(KEY, entries).catch(() => undefined);
}

export async function clearLedger(): Promise<void> {
  set({ loaded: true, entries: [] });
  await setMeta(KEY, []).catch(() => undefined);
}

function subscribe(l: () => void) {
  if (!requested) {
    requested = true;
    void loadLedger();
  }
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useLedger() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Every origin this page has loaded anything from, read from the browser's own timing records. */
export function originsContacted(): string[] {
  const origins = new Set<string>([location.origin]);
  for (const e of performance.getEntriesByType('resource')) {
    try {
      origins.add(new URL(e.name).origin);
    } catch {
      // ignore
    }
  }
  return [...origins];
}

export function resetLedgerState(): void {
  set({ loaded: true, entries: [] });
}
