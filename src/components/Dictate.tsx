import { Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { dictationSupported, startDictation, type DictationSession } from '../lib/dictation';
import { toast } from './ui';

/**
 * A small microphone button that fills a field by voice. Optional: typing stays
 * the default, and the browser's speech recognition may send audio to its maker.
 */
export function DictateButton({ label, onText, onDone }: { label: string; onText: (text: string) => void; onDone?: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const session = useRef<DictationSession | null>(null);
  const last = useRef('');

  useEffect(() => () => session.current?.stop(), []);
  if (!dictationSupported()) return null;

  async function toggle() {
    if (listening) {
      session.current?.stop();
      return;
    }
    last.current = '';
    const s = await startDictation({
      onText: (text) => {
        last.current = text;
        onText(text);
      },
      onEnd: () => {
        setListening(false);
        if (last.current) onDone?.(last.current);
      },
      onError: (message) => {
        setListening(false);
        toast(message);
      },
    });
    if (s) {
      session.current = s;
      setListening(true);
    }
  }

  return (
    <button type="button" className="icon-btn" aria-pressed={listening} aria-label={listening ? `Stop listening` : label} onClick={toggle}>
      {listening ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
    </button>
  );
}
