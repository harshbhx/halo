/**
 * App settings. Kept in localStorage because they hold no personal data
 * (no names, notes or faces): voice, volume, theme and so on.
 */
import { useSyncExternalStore } from 'react';
import type { Strictness } from './matcher';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  welcomeSeen: boolean;
  theme: Theme;
  voiceName: string;
  volume: number;
  rate: number;
  chime: boolean;
  repeatSeconds: number;
  strictness: Strictness;
  useOnDeviceModel: boolean;
  facing: 'user' | 'environment';
}

export const DEFAULT_SETTINGS: Settings = {
  welcomeSeen: false,
  theme: 'system',
  voiceName: '',
  volume: 0.7,
  rate: 0.95,
  chime: true,
  repeatSeconds: 45,
  strictness: 'careful',
  useOnDeviceModel: true,
  facing: 'environment',
};

const KEY = 'fw.settings';
const listeners = new Set<() => void>();
let current: Settings = read();

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Storage may be unavailable (private mode); settings then last for this visit.
  }
  listeners.forEach((l) => l());
}

export function resetSettings(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  current = { ...DEFAULT_SETTINGS };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}
