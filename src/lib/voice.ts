/**
 * The whisper voice: the browser's own speech synthesis (no key, no server),
 * a soft chime made with Web Audio, and a light haptic tap where the phone has one.
 * Audio follows the phone's output, so with earbuds in it plays in the ear.
 */
import type { ChimeSound, OutputMode } from './settings';

export interface VoiceOptions {
  voiceName?: string;
  volume: number; // 0..1
  rate: number; // 0.7..1.3
  chimeSound: ChimeSound;
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** Voices load asynchronously in some browsers; wait briefly for them. */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', done);
    setTimeout(done, timeoutMs);
  });
}

/** Prefer a natural-sounding voice in the user's language. */
export function pickDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const lang = (navigator.language || 'en-US').toLowerCase();
  const base = lang.split('-')[0];
  const inLang = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const langPool = inLang.length ? inLang : voices;
  // Prefer a voice the phone speaks itself, so whispers keep working offline.
  const local = langPool.filter((v) => v.localService);
  const pool = local.length ? local : langPool;
  const natural = pool.find((v) => /natural|neural|enhanced|premium|samantha|google/i.test(v.name));
  return natural ?? pool.find((v) => v.lang.toLowerCase() === lang) ?? pool[0];
}

/** Voices the device synthesises itself keep working offline; the others need the internet. */
export function isOnDeviceVoice(v: SpeechSynthesisVoice | undefined): boolean {
  return !!v && v.localService;
}

/** The voice that will actually speak: the chosen one, or the automatic pick. */
export function activeVoice(voices: SpeechSynthesisVoice[], name: string): SpeechSynthesisVoice | undefined {
  return voices.find((v) => v.name === name) ?? pickDefaultVoice(voices);
}

let audioCtx: AudioContext | null = null;

/**
 * Call from a tap (user gesture). Mobile browsers only allow audio and speech
 * after a gesture, so every entry into Whisper mode unlocks both.
 */
export function unlockAudio(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx && !audioCtx) audioCtx = new Ctx();
    void audioCtx?.resume();
  } catch {
    audioCtx = null;
  }
  if (speechSupported()) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}

const CHIMES: Record<Exclude<ChimeSound, 'off'>, Array<{ freq: number; at: number; length: number }>> = {
  // A rising fifth, low and short.
  'two-notes': [
    { freq: 659.25, at: 0, length: 0.35 },
    { freq: 880, at: 0.12, length: 0.4 },
  ],
  // One soft bell with a quiet overtone.
  bell: [
    { freq: 784, at: 0, length: 0.9 },
    { freq: 1568, at: 0, length: 0.5 },
  ],
};

/** A soft chime so a whisper never startles. */
export function playChime(sound: ChimeSound, volume: number): Promise<void> {
  if (!audioCtx || sound === 'off') return Promise.resolve();
  const ctx = audioCtx;
  const start = ctx.currentTime + 0.01;
  let end = 0;
  CHIMES[sound].forEach((note, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note.freq;
    const t = start + note.at;
    const peak = (i === 0 ? 0.08 : 0.04) * volume;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + note.length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + note.length + 0.05);
    end = Math.max(end, note.at + note.length);
  });
  return new Promise((resolve) => setTimeout(resolve, Math.min(end, 0.45) * 1000));
}

/** A light tap on phones that support it. Silent elsewhere. */
export function haptic(pattern: number | number[] = 25): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // not supported
  }
}

let clip: HTMLAudioElement | null = null;

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
  clip?.pause();
}

/** Plays a stored natural-voice clip (base64 MP3) from memory: no network involved. */
export async function playClip(base64: string, volume: number): Promise<boolean> {
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
    clip = new Audio(url);
    clip.volume = Math.min(Math.max(volume, 0), 1);
    await clip.play();
    await new Promise<void>((resolve) => {
      clip!.onended = () => resolve();
      clip!.onerror = () => resolve();
      setTimeout(resolve, 15000);
    });
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/** Is there a voice on this device for a language (e.g. "hi")? */
export function voiceFor(lang: string): SpeechSynthesisVoice | undefined {
  if (!speechSupported()) return undefined;
  return window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
}

/** Speaks a line. Resolves when finished (or straight away if speech is unavailable). */
export async function speak(text: string, options: VoiceOptions): Promise<void> {
  await playChime(options.chimeSound, options.volume);
  if (!speechSupported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  const chosen = voices.find((v) => v.name === options.voiceName) ?? pickDefaultVoice(voices);
  if (chosen) {
    utterance.voice = chosen;
    utterance.lang = chosen.lang;
  }
  utterance.volume = Math.min(Math.max(options.volume, 0), 1);
  utterance.rate = Math.min(Math.max(options.rate, 0.6), 1.4);
  utterance.pitch = 1;
  await new Promise<void>((resolve) => {
    const finish = () => resolve();
    utterance.onend = finish;
    utterance.onerror = finish;
    // Safety net: some engines never fire onend.
    setTimeout(finish, 2000 + text.length * 120);
    synth.speak(utterance);
  });
}

/**
 * Deliver a recognised person the way the user chose: a spoken whisper, a
 * chime, a vibration, or nothing but the caption.
 */
export async function deliver(
  text: string,
  mode: OutputMode,
  options: VoiceOptions & { haptics: boolean },
): Promise<void> {
  switch (mode) {
    case 'voice':
      if (options.haptics) haptic(25);
      await speak(text, options);
      return;
    case 'chime':
      if (options.haptics) haptic(25);
      await playChime(options.chimeSound === 'off' ? 'two-notes' : options.chimeSound, options.volume);
      return;
    case 'vibrate':
      haptic([30, 70, 30]);
      return;
    case 'silent':
      return;
  }
}
