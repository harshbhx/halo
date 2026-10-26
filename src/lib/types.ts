export interface Cues {
  clothes?: string;
  hair?: string;
  glasses?: string;
  other?: string;
}

export type WhisperSource = 'rules' | 'on-device-model' | 'enhanced' | 'edited';

export interface Person {
  id: string;
  name: string;
  /** What the user said or typed about them. */
  note: string;
  /** The one line that gets spoken. */
  whisper: string;
  whisperSource: WhisperSource;
  cues: Cues;
  /** 3 to 5 face fingerprints, 128 numbers each. */
  descriptors: number[][];
  /** Small JPEG data URL for the people list. On this device only. */
  thumb: string;
  /** When this person agreed to be added. */
  consentAt: string;
  /** How: they tapped "I agree" on this phone, or the owner confirmed they said yes. */
  consentMethod?: 'in-person' | 'link' | 'owner-confirmed';
  createdAt: string;
  updatedAt: string;
  /** A child: Halo never sounds confident about children's faces, it only suggests. */
  child?: boolean;
  /** Enhanced mode: a natural voice for one exact line, base64 MP3, kept encrypted with the person. */
  voiceClip?: { text: string; audio: string };
  /** Enhanced mode: the whisper in the user's language (always editable). */
  translated?: { lang: string; text: string };
  /** Synthetic demo person (AI-generated face of someone who does not exist). */
  sample?: boolean;
  /** Where you met, or when you last saw them. Shown under the whisper, never spoken unless you choose Full. */
  met?: string;
  /** Never whisper: Halo still shows who it is on screen, but says nothing and doesn't buzz. */
  quiet?: boolean;
  /** Held at "Could be": after wrong matches, Halo only ever suggests this person, like a child. */
  hold?: boolean;
}
