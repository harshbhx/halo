/**
 * App settings. Kept in localStorage because they hold no personal data
 * (no names, notes or faces): voice, volume, theme and so on.
 */
import { useSyncExternalStore } from 'react';
import type { Strictness } from './matcher';
import type { WhisperStyle } from './whisperStyle';

export type Theme = 'system' | 'light' | 'dark';
/** How a recognised person reaches you. */
export type OutputMode = 'voice' | 'chime' | 'vibrate' | 'silent';
export type ChimeSound = 'two-notes' | 'bell' | 'off';
export type PracticeKind = 'cues' | 'photo';

export interface Settings {
  welcomeSeen: boolean;
  theme: Theme;
  voiceName: string;
  volume: number;
  rate: number;
  outputMode: OutputMode;
  chimeSound: ChimeSound;
  haptics: boolean;
  whisperStyle: WhisperStyle;
  whispersPaused: boolean;
  repeatSeconds: number;
  strictness: Strictness;
  useOnDeviceModel: boolean;
  facing: 'user' | 'environment';
  bigText: boolean;
  highContrast: boolean;
  practiceKind: PracticeKind;
  /** Whispers are spoken only once the user has checked their earbud (or chosen the speaker). */
  speakAllowed: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  welcomeSeen: false,
  theme: 'system',
  voiceName: '',
  volume: 0.7,
  rate: 0.95,
  outputMode: 'voice',
  chimeSound: 'two-notes',
  haptics: true,
  whisperStyle: 'short',
  whispersPaused: false,
  repeatSeconds: 45,
  strictness: 'careful',
  useOnDeviceModel: true,
  facing: 'environment',
  bigText: false,
  highContrast: false,
  practiceKind: 'cues',
  speakAllowed: false,
};

const KEY = 'fw.settings';
const listeners = new Set<() => void>();
let current: Settings = read();

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const saved = JSON.parse(raw) as Partial<Settings> & { chime?: boolean };
    // Older versions stored the chime as a yes/no switch.
    if (typeof saved.chime === 'boolean' && !saved.chimeSound) saved.chimeSound = saved.chime ? 'two-notes' : 'off';
    delete saved.chime;
    return { ...DEFAULT_SETTINGS, ...saved };
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

/** Reflect the reading settings on <html> so CSS tokens can follow them. */
export function applyDocumentSettings(s: Settings): void {
  const root = document.documentElement;
  if (s.theme === 'system') root.removeAttribute('data-mode');
  else root.setAttribute('data-mode', s.theme);
  root.toggleAttribute('data-big-text', s.bigText);
  root.toggleAttribute('data-high-contrast', s.highContrast);
}
