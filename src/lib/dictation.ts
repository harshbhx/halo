/**
 * Voice notes through the browser's speech recognition (Web Speech API).
 * Where the browser can recognise speech on the device, we ask it to.
 * Otherwise the browser maker's speech service may hear the note; the privacy
 * page says so, and typing is always available.
 */

interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
}

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  processLocally?: boolean;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface RecognitionCtor {
  new (): RecognitionLike;
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
}

function ctor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function dictationSupported(): boolean {
  return typeof window !== 'undefined' && ctor() !== null;
}

export interface DictationHandlers {
  onText: (text: string, final: boolean) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}

export interface DictationSession {
  stop: () => void;
  onDevice: boolean;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access was blocked. You can allow it in your browser settings, or type instead.',
  'service-not-allowed': 'Dictation is turned off in this browser. You can type instead.',
  'no-speech': "We didn't hear anything. Tap the microphone and try again.",
  network: "Dictation needs a connection in this browser. You can type instead.",
  'audio-capture': 'No microphone was found. You can type instead.',
  'language-not-supported': "Dictation doesn't support this language here. You can type instead.",
};

export async function startDictation(handlers: DictationHandlers): Promise<DictationSession | null> {
  const Ctor = ctor();
  if (!Ctor) return null;
  const lang = navigator.language || 'en-US';
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = true;

  let onDevice = false;
  try {
    if (typeof Ctor.available === 'function' && 'processLocally' in rec) {
      const status = await Ctor.available({ langs: [lang], processLocally: true });
      if (status === 'available') {
        rec.processLocally = true;
        onDevice = true;
      }
    }
  } catch {
    onDevice = false;
  }

  let finalText = '';
  rec.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) finalText += result[0].transcript;
      else interim += result[0].transcript;
    }
    handlers.onText((finalText + interim).trim(), interim.length === 0);
  };
  rec.onerror = (event) => handlers.onError(ERRORS[event.error] ?? 'Dictation stopped. You can type instead.');
  rec.onend = () => handlers.onEnd();
  try {
    rec.start();
  } catch {
    handlers.onError('Dictation could not start. You can type instead.');
    return null;
  }
  return { stop: () => rec.stop(), onDevice };
}
