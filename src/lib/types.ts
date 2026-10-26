export interface Cues {
  clothes?: string;
  hair?: string;
  glasses?: string;
  other?: string;
}

export type WhisperSource = 'rules' | 'on-device-model' | 'edited';

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
  /** When the user confirmed this person agreed to be added. */
  consentAt: string;
  createdAt: string;
  updatedAt: string;
  /** Synthetic demo person (AI-generated face of someone who does not exist). */
  sample?: boolean;
}
