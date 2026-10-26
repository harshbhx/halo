import { Check, ChevronLeft, Mic, Play, RefreshCw, SwitchCamera, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from '../components/ui';
import { CAMERA_MESSAGES, CameraError, openCamera, stopStream, type CameraProblem } from '../lib/camera';
import { dictationSupported, startDictation, type DictationSession } from '../lib/dictation';
import { DESCRIBE_MESSAGES, describe, grabFrame, loadEngine } from '../lib/faceEngine';
import { onDeviceModelAvailable, whisperWithModel } from '../lib/onDeviceModel';
import { addOrUpdatePerson, newId } from '../lib/people';
import { navigate } from '../lib/router';
import { getSettings, updateSettings, useSettings } from '../lib/settings';
import type { Cues, WhisperSource } from '../lib/types';
import { speak, unlockAudio } from '../lib/voice';
import { makeWhisper } from '../lib/whisper';
import { euclidean } from '../lib/matcher';

/** Shots of one person sit close together; a far-off shot is probably someone else. */
const SAME_PERSON_LIMIT = 0.55;

export const MIN_SHOTS = 3;
const MAX_SHOTS = 5;
const TIPS = ['Look straight at the camera', 'Now turn a little to one side', 'And a little to the other side', 'Maybe one with a smile', 'One more, any angle'];

export interface Shot {
  descriptor: number[];
  thumb: string;
}

function Progress({ step }: { step: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1} aria-label="Progress">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="progress__seg" data-state={i < step ? 'done' : i === step ? 'current' : 'todo'}>
          <span />
        </span>
      ))}
    </div>
  );
}

/* ---------- Step 2: photos ---------- */

export function PhotoStep({
  name,
  shots,
  setShots,
  heading = true,
}: {
  name: string;
  shots: Shot[];
  setShots: (s: Shot[]) => void;
  heading?: boolean;
}) {
  const settings = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [engine, setEngine] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const facing = settings.facing;

  useEffect(() => {
    let cancelled = false;
    loadEngine(setProgress)
      .then(() => !cancelled && setEngine('ready'))
      .catch(() => !cancelled && setEngine('failed'));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setProblem(null);
    setCameraOn(false);
    openCamera(facing)
      .then(async (s) => {
        if (cancelled) return stopStream(s);
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        await video.play().catch(() => undefined);
        setCameraOn(true);
      })
      .catch((err) => !cancelled && setProblem(err instanceof CameraError ? err.problem : 'unknown'));
    return () => {
      cancelled = true;
      stopStream(stream);
    };
  }, [facing, attempt]);

  async function capture() {
    const video = videoRef.current;
    if (!video || busy || shots.length >= MAX_SHOTS || video.videoWidth === 0) return;
    setBusy(true);
    setFlash((f) => f + 1);
    try {
      const frame = grabFrame(video);
      const result = await describe(frame);
      if (result.ok && shots.length > 0 && Math.min(...shots.map((s) => euclidean(s.descriptor, result.descriptor))) > SAME_PERSON_LIMIT) {
        toast('That looks like someone else. Keep the same person in view.', 4000);
      } else if (result.ok) {
        const next = [...shots, { descriptor: result.descriptor, thumb: result.thumb }];
        setShots(next);
        if (next.length === MIN_SHOTS) toast('Three good photos. Add more or continue.');
      } else {
        toast(DESCRIBE_MESSAGES[result.reason], 4000);
      }
    } catch {
      toast('That photo could not be read. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const ready = cameraOn && engine === 'ready';
  const tip = shots.length >= MAX_SHOTS ? 'All set' : TIPS[shots.length];

  return (
    <>
      {heading && (
        <div>
          <h1 className="title title--md" tabIndex={-1} id="step-title">
            Take {MIN_SHOTS} photos of {name}
          </h1>
          <p className="lede">Straight on, then turned a little each way. Good light helps.</p>
        </div>
      )}

      <div className={`camera camera--capture${facing === 'user' ? ' camera--mirror' : ''}`}>
        <video ref={videoRef} muted playsInline autoPlay aria-label="Camera preview" />
        <svg className="camera__guide" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <mask id="oval-mask">
              <rect width="300" height="400" fill="white" />
              <ellipse cx="150" cy="190" rx="92" ry="122" fill="black" />
            </mask>
          </defs>
          <rect width="300" height="400" fill="rgb(5 8 10 / 0.45)" mask="url(#oval-mask)" />
          <ellipse cx="150" cy="190" rx="92" ry="122" fill="none" stroke="var(--ring)" strokeWidth="3" strokeDasharray={ready ? '0' : '6 8'} opacity="0.9" />
        </svg>
        {ready && <div className="camera__tip">{tip}</div>}
        <div className="camera__flash" data-on={flash % 2 === 1 ? 'true' : 'false'} key={flash} />
        {!problem && !ready && (
          <div className="camera__state">
            <div className="loader" aria-hidden="true">
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p>{engine === 'failed' ? "The face reader couldn't start on this device." : 'Getting ready on your phone…'}</p>
          </div>
        )}
        {problem && (
          <div className="camera__state" role="alert">
            <p style={{ fontSize: 22, fontWeight: 800 }}>{CAMERA_MESSAGES[problem].title}</p>
            <p style={{ opacity: 0.85 }}>{CAMERA_MESSAGES[problem].body}</p>
            <button type="button" className="btn btn--secondary" onClick={() => setAttempt((a) => a + 1)}>
              <RefreshCw size={20} aria-hidden="true" /> Try again
            </button>
          </div>
        )}
        <button
          type="button"
          className="round glass"
          style={{ position: 'absolute', right: 12, bottom: 12, width: 48, height: 48 }}
          onClick={() => updateSettings({ facing: facing === 'user' ? 'environment' : 'user' })}
          aria-label="Switch camera"
        >
          <SwitchCamera size={22} aria-hidden="true" />
        </button>
      </div>

      <div className="capture-bar">
        <div className="shots" aria-label={`${shots.length} photos taken`}>
          {shots.map((s, i) => (
            <button
              type="button"
              key={i}
              className="shot"
              onClick={() => setShots(shots.filter((_, j) => j !== i))}
              aria-label={`Remove photo ${i + 1}`}
              style={{ padding: 0, border: 0 }}
            >
              <img src={s.thumb} alt="" />
            </button>
          ))}
          {shots.length < MIN_SHOTS &&
            Array.from({ length: MIN_SHOTS - shots.length }, (_, i) => <span key={`e${i}`} className="shot shot--empty" aria-hidden="true" />)}
        </div>
        <button
          type="button"
          className="shutter"
          onClick={capture}
          disabled={!ready || busy || shots.length >= MAX_SHOTS}
          data-busy={busy}
          aria-label={busy ? 'Reading photo' : `Take photo ${shots.length + 1}`}
        />
        <p className="shot-count" aria-live="polite">
          {shots.length} of {shots.length >= MIN_SHOTS ? MAX_SHOTS : MIN_SHOTS}
        </p>
      </div>
    </>
  );
}

/* ---------- Step 3: note and whisper ---------- */

function NoteStep({
  name,
  note,
  setNote,
  whisper,
  setWhisper,
  source,
  setSource,
}: {
  name: string;
  note: string;
  setNote: (v: string) => void;
  whisper: string;
  setWhisper: (v: string) => void;
  source: WhisperSource;
  setSource: (s: WhisperSource) => void;
}) {
  const settings = useSettings();
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState('');
  const sessionRef = useRef<DictationSession | null>(null);
  const canDictate = dictationSupported();
  const sourceRef = useRef(source);
  sourceRef.current = source;

  // Rules write the whisper instantly; an on-device model (if the browser has one) may refine it.
  useEffect(() => {
    if (sourceRef.current === 'edited') return;
    setWhisper(makeWhisper(name, note));
    setSource('rules');
    if (!settings.useOnDeviceModel || note.trim().split(' ').length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!(await onDeviceModelAvailable())) return;
      const line = await whisperWithModel(name, note);
      if (!cancelled && line && sourceRef.current !== 'edited') {
        setWhisper(line);
        setSource('on-device-model');
      }
    }, 900);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, note, settings.useOnDeviceModel, setWhisper, setSource]);

  useEffect(() => () => sessionRef.current?.stop(), []);

  async function toggleMic() {
    if (listening) {
      sessionRef.current?.stop();
      return;
    }
    setMicError('');
    const base = note.trim() ? `${note.trim()} ` : '';
    const session = await startDictation({
      onText: (text) => setNote(base + text),
      onEnd: () => setListening(false),
      onError: (message) => {
        setMicError(message);
        setListening(false);
      },
    });
    if (session) {
      sessionRef.current = session;
      setListening(true);
    }
  }

  const sourceLabel =
    source === 'edited' ? 'Edited by you' : source === 'on-device-model' ? "Written by your browser's on-device model" : 'Written on this phone by built-in rules';

  return (
    <>
      <div>
        <h1 className="title title--md" tabIndex={-1} id="step-title">
          What should we whisper?
        </h1>
        <p className="lede">Say or type who {name} is and how you know them. We'll turn it into one short line.</p>
      </div>

      {canDictate && (
        <button type="button" className="mic" aria-pressed={listening} onClick={toggleMic}>
          {listening ? <span className="mic__dot" aria-hidden="true" /> : <Mic size={24} aria-hidden="true" />}
          {listening ? 'Listening… tap to stop' : 'Tap and say it'}
        </button>
      )}
      {micError && (
        <p className="notice" role="alert">
          {micError}
        </p>
      )}

      <label className="field">
        <span className="field__label">Your note</span>
        <textarea
          className="textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`This is ${name}, my neighbour, had knee surgery last month`}
          rows={3}
        />
        <span className="field__hint">Only you will ever see or hear this.</span>
      </label>

      <div className="whisper-card">
        <label className="whisper-card__label" htmlFor="whisper-text">
          Whisper preview
        </label>
        <textarea
          id="whisper-text"
          className="whisper-card__text"
          value={whisper}
          rows={Math.max(2, Math.ceil(whisper.length / 24))}
          onChange={(e) => {
            setWhisper(e.target.value);
            setSource('edited');
          }}
        />
        <div className="whisper-card__foot">
          <span>{sourceLabel}</span>
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              unlockAudio();
              const s = getSettings();
              void speak(whisper, { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chime: false });
            }}
            disabled={!whisper.trim()}
          >
            <Play size={18} aria-hidden="true" /> Hear it
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- Step 4: cues ---------- */

const CUE_FIELDS: Array<{ key: keyof Cues; label: string; placeholder: string }> = [
  { key: 'clothes', label: 'Usual clothes', placeholder: 'Green parka, running shoes' },
  { key: 'hair', label: 'Hair', placeholder: 'Short grey hair, beard' },
  { key: 'glasses', label: 'Glasses or accessories', placeholder: 'Round glasses, silver earrings' },
  { key: 'other', label: 'Voice or anything else', placeholder: 'Deep voice, walks a beagle' },
];

/* ---------- The flow ---------- */

export function Enrol() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const [note, setNote] = useState('');
  const [whisper, setWhisper] = useState('');
  const [source, setSource] = useState<WhisperSource>('rules');
  const [cues, setCues] = useState<Cues>({});
  const [saving, setSaving] = useState(false);
  const consentAt = useRef<string>('');

  useEffect(() => {
    document.getElementById('step-title')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  const cleanName = name.trim();
  const canContinue = [cleanName.length > 0 && consent, shots.length >= MIN_SHOTS, whisper.trim().length > 0, true][step];

  async function save() {
    setSaving(true);
    const now = new Date().toISOString();
    try {
      await addOrUpdatePerson({
        id: newId(),
        name: cleanName,
        note: note.trim(),
        whisper: whisper.trim(),
        whisperSource: source,
        cues: Object.fromEntries(Object.entries(cues).filter(([, v]) => v && v.trim())) as Cues,
        descriptors: shots.map((s) => s.descriptor),
        thumb: shots[0]?.thumb ?? '',
        consentAt: consentAt.current || now,
        createdAt: now,
        updatedAt: now,
      });
      toast(`${cleanName} added. Open Whisper to try it.`);
      navigate('/', true);
    } catch {
      toast("Couldn't save. Is storage blocked in this browser?");
      setSaving(false);
    }
  }

  function next() {
    if (!canContinue) return;
    if (step === 0) consentAt.current = new Date().toISOString();
    if (step < 3) setStep(step + 1);
    else void save();
  }

  return (
    <main className="screen screen--flow" aria-labelledby="step-title">
      <div className="flow-head">
        <button
          type="button"
          className="icon-btn"
          onClick={() => (step === 0 ? navigate('/') : setStep(step - 1))}
          aria-label={step === 0 ? 'Cancel adding' : 'Back'}
        >
          {step === 0 ? <X size={24} aria-hidden="true" /> : <ChevronLeft size={26} aria-hidden="true" />}
        </button>
        <Progress step={step} />
        <span className="step-count">Step {step + 1} of 4</span>
      </div>

      <form
        className="flow-body"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        {step === 0 && (
          <>
            <div>
              <h1 className="title title--md" tabIndex={-1} id="step-title">
                Who are you adding?
              </h1>
              <p className="lede">Only add people who have said yes. Their face stays on this phone.</p>
            </div>
            <label className="field">
              <span className="field__label">Their name</span>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="next"
                placeholder="For example, Raj"
                maxLength={60}
              />
            </label>
            <label className="consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span className="consent__box" aria-hidden="true">
                <Check size={22} strokeWidth={3} />
              </span>
              <span>
                <span className="consent__title">{cleanName || 'They'} agreed to be added</span>
                <span className="consent__body" style={{ display: 'block' }}>
                  I asked, and they're happy for my phone to recognise them. I can delete them any time.
                </span>
              </span>
            </label>
          </>
        )}

        {step === 1 && <PhotoStep name={cleanName} shots={shots} setShots={setShots} />}

        {step === 2 && (
          <NoteStep
            name={cleanName}
            note={note}
            setNote={setNote}
            whisper={whisper}
            setWhisper={setWhisper}
            source={source}
            setSource={setSource}
          />
        )}

        {step === 3 && (
          <>
            <div>
              <h1 className="title title--md" tabIndex={-1} id="step-title">
                How can you spot {cleanName}?
              </h1>
              <p className="lede">Optional. Clothes, hair, glasses or a voice often help more than a face. These show under the whisper.</p>
            </div>
            <div className="cue-grid">
              {CUE_FIELDS.map((f) => (
                <label className="field" key={f.key}>
                  <span className="field__label">{f.label}</span>
                  <input
                    className="input"
                    value={cues[f.key] ?? ''}
                    onChange={(e) => setCues({ ...cues, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    autoComplete="off"
                    maxLength={80}
                  />
                </label>
              ))}
            </div>
          </>
        )}

        <div className="flow-foot">
          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={!canContinue || saving}>
            {step === 3 ? (saving ? 'Saving…' : `Save ${cleanName}`) : 'Continue'}
          </button>
          {step === 1 && (
            <p className="field__hint" style={{ textAlign: 'center' }}>
              {shots.length < MIN_SHOTS
                ? `${MIN_SHOTS - shots.length} more ${MIN_SHOTS - shots.length === 1 ? 'photo' : 'photos'} to go. Only face fingerprints and one small picture are kept.`
                : 'Only face fingerprints and one small picture are kept.'}
            </p>
          )}
        </div>
      </form>
    </main>
  );
}
