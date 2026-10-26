/**
 * "Wrong person?" reports. When Halo names the wrong person, a tap notes the
 * match on this phone (encrypted, never sent): who it named, how close the
 * match was, and the setting in use. Settings turns the reports into
 * suggestions: the Careful setting, holding someone at "Could be", new photos.
 */
import { useSyncExternalStore } from 'react';
import { STATE_LIMITS, type Strictness } from './matcher';
import { getMeta, setMeta } from './vault';

export interface WrongMatch {
  at: number;
  personId: string;
  name: string;
  distance: number;
  runnerUp: number;
  strictness: Strictness;
}

export type Suggestion =
  | { kind: 'careful'; avoided: number; total: number }
  | { kind: 'hold'; personId: string; name: string; count: number }
  | { kind: 'photos'; personId: string; name: string; count: number };

const MAX_REPORTS = 200;
let state: { loaded: boolean; reports: WrongMatch[] } = { loaded: false, reports: [] };
const listeners = new Set<() => void>();
const set = (next: typeof state) => {
  state = next;
  listeners.forEach((l) => l());
};

export async function loadReports(): Promise<void> {
  const reports = (await getMeta<WrongMatch[]>('wrongMatches').catch(() => undefined)) ?? [];
  set({ loaded: true, reports });
}

export async function addReport(report: WrongMatch): Promise<void> {
  if (!state.loaded) await loadReports();
  const reports = [...state.reports, report].slice(-MAX_REPORTS);
  set({ loaded: true, reports });
  await setMeta('wrongMatches', reports);
}

export async function clearReports(): Promise<void> {
  set({ loaded: true, reports: [] });
  await setMeta('wrongMatches', []);
}

export function resetReportsState(): void {
  set({ loaded: false, reports: [] });
}

let requested = false;
function subscribe(l: () => void) {
  if (!requested) {
    requested = true;
    void loadReports();
  }
  listeners.add(l);
  return () => listeners.delete(l);
}
export function useReports() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/**
 * What would help, from the reports. Pure, so it can be tested:
 * - on Balanced, how many wrong matches Careful would have kept quiet;
 * - a person named wrongly twice or more: hold them at "Could be";
 * - a person named wrongly once: add new photos (looks change).
 */
export function suggest(reports: WrongMatch[], strictness: Strictness, held: (id: string) => boolean): Suggestion[] {
  const out: Suggestion[] = [];
  if (strictness === 'balanced' && reports.length > 0) {
    const careful = STATE_LIMITS.careful;
    const avoided = reports.filter((r) => r.distance >= careful.confident || r.runnerUp - r.distance < careful.margin).length;
    if (avoided > 0) out.push({ kind: 'careful', avoided, total: reports.length });
  }
  const byPerson = new Map<string, { name: string; count: number }>();
  for (const r of reports) {
    const p = byPerson.get(r.personId) ?? { name: r.name, count: 0 };
    p.count += 1;
    byPerson.set(r.personId, p);
  }
  for (const [personId, p] of [...byPerson.entries()].sort((a, b) => b[1].count - a[1].count)) {
    if (held(personId)) continue;
    out.push(p.count >= 2 ? { kind: 'hold', personId, name: p.name, count: p.count } : { kind: 'photos', personId, name: p.name, count: p.count });
  }
  return out;
}
