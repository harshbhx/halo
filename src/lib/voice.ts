/**
 * The whisper voice: the browser's own speech synthesis (no key, no server),
 * plus an optional soft two-note chime made with Web Audio.
 * Audio follows the phone's output, so with earbuds in it plays in the ear.
 */

export interface VoiceOptions {
  voiceName?: string;
  volume: number; // 0..1
  rate: number; // 0.7..1.3
  chime: boolean;
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
  const pool = inLang.length ? inLang : voices;
  const natural = pool.find((v) => /natural|neural|enhanced|premium|samantha|google/i.test(v.name));
  return natural ?? pool.find((v) => v.lang.toLowerCase() === lang) ?? pool[0];
}

let audioCtx: AudioContext | null = null;

/**
 * Call from a tap (user gesture). Mobile browsers only allow audio and speech
 * after a gesture, so Whisper mode unlocks both when it starts.
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

/** A soft, low two-note chime so the whisper never startles. */
export function playChime(volume: number): Promise<void> {
  if (!audioCtx) return Promise.resolve();
  const ctx = audioCtx;
  const start = ctx.currentTime + 0.01;
  const notes = [659.25, 880];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = start + i * 0.12;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08 * volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
  return new Promise((resolve) => setTimeout(resolve, 380));
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/** Speaks a whisper. Resolves when finished (or straight away if speech is unavailable). */
export async function speak(text: string, options: VoiceOptions): Promise<void> {
  if (options.chime) await playChime(options.volume);
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
