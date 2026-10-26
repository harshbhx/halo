/** "Who was that?": the last five whispers, in memory only. Gone when the app closes. */
export interface RecentWhisper {
  personId: string;
  name: string;
  line: string;
  at: number;
}

const recent: RecentWhisper[] = [];

export function remember(entry: RecentWhisper): void {
  const i = recent.findIndex((r) => r.personId === entry.personId);
  if (i >= 0) recent.splice(i, 1);
  recent.unshift(entry);
  recent.splice(5);
}

export function recentWhispers(): RecentWhisper[] {
  return [...recent];
}

export function forgetRecent(): void {
  recent.splice(0);
}
