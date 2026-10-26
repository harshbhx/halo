/**
 * Saying a person's whisper: the stored natural voice if there is one for this
 * exact line, otherwise the phone's own voice in the right language, otherwise
 * nothing aloud (the caption still shows it). Also where Enhanced mode adds a
 * translation and a natural voice after a person is saved.
 */
import { cloudWrite, enhancedOn, naturalVoice, translateWhisper } from './enhanced';
import { buzzFor, outputFor } from './rules';
import { getSettings, type OutputMode, type Settings } from './settings';
import type { Person } from './types';
import { deliver, haptic, playChime, playClip, speak, voiceFor } from './voice';
import { spokenLine, type WhisperStyle } from './whisperStyle';

export function lineFor(person: Person, s: Settings = getSettings(), style: WhisperStyle = s.whisperStyle): { text: string; lang: string } {
  if (s.whisperLang !== 'en' && person.translated?.lang === s.whisperLang) return { text: person.translated.text, lang: s.whisperLang };
  return { text: spokenLine(person, style), lang: 'en' };
}

/** What the caption shows: the translation when there is one, else the stored line. */
export function captionLine(person: Person, s: Settings = getSettings()): string {
  return s.whisperLang !== 'en' && person.translated?.lang === s.whisperLang ? person.translated.text : person.whisper;
}

export async function sayPerson(
  person: Person,
  options: { mode?: OutputMode; style?: WhisperStyle; chime?: boolean; onToday?: boolean } = {},
): Promise<void> {
  const s = getSettings();
  const line = lineFor(person, s, options.style ?? s.whisperStyle);
  // A mode passed in is the user asking (a tap on "Remind me"); otherwise the rules decide:
  // never-whisper people, quiet hours and the earbud check.
  const mode = options.mode ?? outputFor(person, s, new Date()).mode;
  const chimeSound = options.chime === false ? 'off' : s.chimeSound;
  if (mode === 'vibrate') {
    haptic([...buzzFor(!!options.onToday)]);
    return;
  }
  if (mode !== 'voice') {
    await deliver(line.text, mode, { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chimeSound, haptics: s.haptics });
    return;
  }
  if (s.haptics) haptic(25);
  if (s.naturalVoice && person.voiceClip?.text === line.text) {
    await playChime(chimeSound, s.volume);
    if (await playClip(person.voiceClip.audio, s.volume)) return;
  }
  if (line.lang !== 'en') {
    const v = voiceFor(line.lang);
    if (!v) return; // no voice for this language on the phone: the caption carries it
    await speak(line.text, { voiceName: v.name, volume: s.volume, rate: s.rate, chimeSound });
    return;
  }
  await speak(line.text, { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chimeSound });
}

/**
 * Enhanced mode, after a person is saved: translate the whisper and make a natural
 * voice for the exact line Halo will say. Only text is sent. Returns the updated
 * person, or the same person when nothing changed (offline, off, or a failure).
 */
export async function enrich(person: Person): Promise<Person> {
  if (!enhancedOn()) return person;
  const s = getSettings();
  let next: Person = { ...person };
  if (s.whisperLang !== 'en' && !(next.translated?.lang === s.whisperLang)) {
    const text = await translateWhisper(person.whisper, s.whisperLang);
    if (text) next = { ...next, translated: { lang: s.whisperLang, text } };
  }
  if (s.naturalVoice) {
    const line = lineFor(next, s);
    if (next.voiceClip?.text !== line.text) {
      const audio = await naturalVoice(line.text, line.lang);
      if (audio) next = { ...next, voiceClip: { text: line.text, audio } };
    }
  }
  return next;
}

/** Enhanced mode's whisper writer, for phones without an on-device model. */
export async function writeInCloud(name: string, note: string): Promise<string | null> {
  if (!enhancedOn() || !getSettings().cloudWriter) return null;
  return cloudWrite(name, note);
}
