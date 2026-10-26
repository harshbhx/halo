import { ChevronLeft, Ear, Lock, Mic, Play, RefreshCw, SwitchCamera, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar, Segmented, toast } from '../components/ui';
import { CAMERA_MESSAGES, CameraError, openCamera, stopStream, type CameraProblem } from '../lib/camera';
import { dictationSupported, startDictation, type DictationSession } from '../lib/dictation';
import { DESCRIBE_MESSAGES, describe, frameBrightness, grabFrame, loadEngine } from '../lib/faceEngine';
import { DARK_BELOW, HINT_TEXT } from '../lib/hints';
import { euclidean } from '../lib/matcher';
import { onDeviceModelAvailable, whisperWithModel } from '../lib/onDeviceModel';
import { addOrUpdatePerson, newId, usePeople } from '../lib/people';
import { navigate } from '../lib/router';
import { getSettings, updateSettings, useSettings } from '../lib/settings';
import type { Cues, Person, WhisperSource } from '../lib/types';
import { speak, unlockAudio } from '../lib/voice';
import { makeWhisper } from '../lib/whisper';
import { enrich, writeInCloud } from '../lib/say';
import { askLink, shareLink, takePendingConsent } from '../lib/consentLink';
import { BRAND } from '../brand';
import { spokenLine, STYLE_LABELS, type WhisperStyle } from '../lib/whisperStyle';

export const MIN_SHOTS = 3;
/** A closed list, kept small on purpose: who you meet often, not a crowd. */
export const MAX_PEOPLE = 50;
export const MAX_PER_DAY = 5;
/** Two people closer than this may be mixed up. */
const LOOKALIKE = 0.55;
const MAX_SHOTS = 5;
/** Shots of one person sit close together; a far-off shot is probably someone else. */
const SAME_PERSON_LIMIT = 0.55;
const TIPS = ['Look straight at the camera', 'Now turn a little to one side', 'And a little to the other', 'One with a smile, if you like', 'One more, any angle'];

export interface Shot {
  descriptor: number[];
  thumb: string;
}

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="steps">
      <div className="steps__bar" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-label="Progress">
        <div className="steps__fill" style={{ transform: `scaleX(${(step + 1) / total})` }} />
      </div>
      <span className="steps__text">
        Step {step + 1} of {total}
      </span>
    </div>
  );
}

/* ---------- Photos ---------- */

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
  const [dark, setDark] = useState(false);
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

  // A light check every second: is it too dark for a good photo?
  useEffect(() => {
    if (!cameraOn) return;
    const timer = setInterval(() => {
      const v = videoRef.current;
      // Judge the light where the face goes (the oval), not the whole frame.
      if (v && v.videoWidth) setDark(frameBrightness(v, { x: v.videoWidth * 0.25, y: v.videoHeight * 0.15, width: v.videoWidth * 0.5, height: v.videoHeight * 0.55 }) < DARK_BELOW);
    }, 1000);
    return () => clearInterval(timer);
  }, [cameraOn]);

  async function capture() {
    const video = videoRef.current;
    if (!video || busy || shots.length >= MAX_SHOTS || video.videoWidth === 0) return;
    setBusy(true);
    setFlash((f) => f + 1);
    try {
      const result = await describe(grabFrame(video));
      if (result.ok && shots.length > 0 && Math.min(...shots.map((s) => euclidean(s.descriptor, result.descriptor))) > SAME_PERSON_LIMIT) {
        toast('That looks like someone else. Keep the same person in view.');
      } else if (result.ok) {
        setShots([...shots, { descriptor: result.descriptor, thumb: result.thumb }]);
      } else {
        toast(DESCRIBE_MESSAGES[result.reason]);
      }
    } catch {
      toast('That photo couldn’t be read. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const ready = cameraOn && engine === 'ready';
  const tip = dark ? HINT_TEXT.dark : shots.length >= MAX_SHOTS ? 'That’s plenty' : TIPS[shots.length];

  return (
    <>
      {heading && (
        <div className="stack">
          <h1 tabIndex={-1} id="step-title">
            Three photos of {name}
          </h1>
          <p className="lead">Straight on, then turned a little each way. Good light helps.</p>
        </div>
      )}

      <div className={`camera${facing === 'user' ? ' camera--mirror' : ''}`}>
        <video ref={videoRef} muted playsInline autoPlay aria-label="Camera preview" />
        <svg className="camera__guide" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <mask id="oval-mask">
              <rect width="300" height="400" fill="white" />
              <ellipse cx="150" cy="185" rx="92" ry="120" fill="black" />
            </mask>
          </defs>
          <rect className="camera__shade" width="300" height="400" mask="url(#oval-mask)" />
          <ellipse cx="150" cy="185" rx="92" ry="120" fill="none" strokeWidth="3" strokeDasharray={ready ? '0' : '6 8'} />
        </svg>
        {ready && <div className="camera__tip">{tip}</div>}
        <div className="camera__flash" data-on={flash % 2 === 1 ? 'true' : 'false'} key={flash} />
        {!problem && !ready && (
          <div className="camera__state">
            <div className="loader" aria-hidden="true">
              <span style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
            </div>
            <p>{engine === 'failed' ? 'The face reader couldn’t start in this browser.' : 'Getting ready on your phone…'}</p>
          </div>
        )}
        {problem && (
          <div className="camera__state" role="alert">
            <p>
              <b>{CAMERA_MESSAGES[problem].title}</b>
            </p>
            <p>{CAMERA_MESSAGES[problem].body}</p>
            <button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>
              <RefreshCw size={18} aria-hidden="true" /> Try the camera again
            </button>
          </div>
        )}
        <button
          type="button"
          className="night-btn camera__flip"
          onClick={() => updateSettings({ facing: facing === 'user' ? 'environment' : 'user' })}
          aria-label="Switch camera"
        >
          <SwitchCamera size={22} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="shutter camera__shutter"
          onClick={capture}
          disabled={!ready || busy || shots.length >= MAX_SHOTS}
          aria-busy={busy}
          aria-label={busy ? 'Reading photo' : `Take photo ${shots.length + 1}`}
        />
      </div>

      <div className="capture">
        <div className="shots" aria-label={`${shots.length} photos taken`}>
          {shots.map((s, i) => (
            <button type="button" key={i} className="shot" onClick={() => setShots(shots.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`}>
              <img src={s.thumb} alt="" width={48} height={48} />
            </button>
          ))}
          {shots.length < MIN_SHOTS &&
            Array.from({ length: MIN_SHOTS - shots.length }, (_, i) => <span key={`e${i}`} className="shot shot--empty" aria-hidden="true" />)}
        </div>
        <p className="shot-count" aria-live="polite">
          {shots.length} of {shots.length >= MIN_SHOTS ? MAX_SHOTS : MIN_SHOTS}
        </p>
      </div>
    </>
  );
}

/* ---------- Note and whisper ---------- */

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
  const [style, setStyle] = useState<WhisperStyle>(settings.whisperStyle);
  const sessionRef = useRef<DictationSession | null>(null);
  const canDictate = dictationSupported();
  const sourceRef = useRef(source);
  sourceRef.current = source;

  // Rules write the whisper at once; an on-device model, if the browser has one, may refine it.
  useEffect(() => {
    if (sourceRef.current === 'edited') return;
    setWhisper(makeWhisper(name, note));
    setSource('rules');
    if (!settings.useOnDeviceModel || note.trim().split(' ').length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const onDevice = await onDeviceModelAvailable();
      const line = onDevice ? await whisperWithModel(name, note) : await writeInCloud(name, note);
      if (!cancelled && line && sourceRef.current !== 'edited') {
        setWhisper(line);
        setSource(onDevice ? 'on-device-model' : 'enhanced');
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
    source === 'edited'
      ? 'You edited this line'
      : source === 'on-device-model'
        ? 'Written by your browser’s on-device model'
        : source === 'enhanced'
          ? 'Written by Enhanced mode (your note was sent as text)'
          : 'Written on this phone by built-in rules';

  return (
    <>
      <div className="stack">
        <h1 tabIndex={-1} id="step-title">
          What should we whisper?
        </h1>
        <p className="lead">Say or type who {name} is and how you know them.</p>
      </div>

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

      {canDictate && (
        <div className="stack">
          <button type="button" className="btn btn--block mic" aria-pressed={listening} onClick={toggleMic}>
            <Mic size={20} aria-hidden="true" />
            {listening ? 'Listening, tap to stop' : 'Dictate instead'}
          </button>
          <span className="field__hint">Dictation is your browser’s: it may send the audio to its maker (Google, in Chrome). Typing stays on the phone.</span>
        </div>
      )}
      {micError && (
        <p className="notice" role="alert">
          {micError}
        </p>
      )}

      <div className="panel whisper-panel">
        <label className="field__label" htmlFor="whisper-text">
          Whisper preview
        </label>
        <textarea
          id="whisper-text"
          className="whisper-panel__text"
          value={whisper}
          rows={Math.max(2, Math.ceil(whisper.length / 22))}
          onChange={(e) => {
            setWhisper(e.target.value);
            setSource('edited');
          }}
        />
        <Segmented<WhisperStyle>
          label="How it sounds"
          value={style}
          options={(Object.keys(STYLE_LABELS) as WhisperStyle[]).map((k) => ({ value: k, label: STYLE_LABELS[k].name }))}
          onChange={setStyle}
        />
        <div className="whisper-panel__foot">
          <span className="label">{sourceLabel}</span>
          <button
            type="button"
            className="btn"
            onClick={() => {
              unlockAudio();
              const s = getSettings();
              void speak(spokenLine({ name, whisper, cues: {} }, style), { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chimeSound: s.chimeSound });
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

/* ---------- Cues ---------- */

const CUE_FIELDS: Array<{ key: keyof Cues; label: string; placeholder: string }> = [
  { key: 'clothes', label: 'Usual clothes', placeholder: 'Green parka, running shoes' },
  { key: 'hair', label: 'Hair', placeholder: 'Short grey hair, a beard' },
  { key: 'glasses', label: 'Glasses or accessories', placeholder: 'Round glasses, silver earrings' },
  { key: 'other', label: 'Voice or anything else', placeholder: 'Deep voice, walks a beagle' },
];

/* ---------- The flow ---------- */

export function Enrol() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [consentMethod, setConsentMethod] = useState<Person['consentMethod'] | null>(null);
  const [consentTick, setConsentTick] = useState(false);
  const [child, setChild] = useState(false);
  const { people } = usePeople();
  const real = people.filter((p) => !p.sample);
  const today = new Date().toDateString();
  const addedToday = real.filter((p) => new Date(p.createdAt).toDateString() === today).length;
  const capReached = real.length >= MAX_PEOPLE || addedToday >= MAX_PER_DAY;
  const [shots, setShots] = useState<Shot[]>([]);
  const [note, setNote] = useState('');
  const [whisper, setWhisper] = useState('');
  const [source, setSource] = useState<WhisperSource>('rules');
  const [cues, setCues] = useState<Cues>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Person | null>(null);
  const consentAt = useRef<string>('');
  const [linkStatus, setLinkStatus] = useState('');

  // An answer that came back by link starts the flow at the photos.
  useEffect(() => {
    const answer = takePendingConsent();
    if (!answer) return;
    setName(answer.name);
    setNote(answer.intro);
    setWhisper(answer.intro);
    setSource('edited');
    if (answer.cue) setCues({ other: answer.cue });
    consentAt.current = answer.at;
    setConsentMethod('link');
    setStep(3);
  }, []);

  async function sendLink() {
    const url = askLink(location.origin, cleanName, whisper);
    const result = await shareLink(url, `${BRAND.name}: a question for ${cleanName}`, `${cleanName}, could my phone recognise you? Read what it keeps first.`);
    setLinkStatus(
      result === 'shared'
        ? `Sent. When ${cleanName} answers, open the link they send back.`
        : result === 'copied'
          ? `Link copied. Send it to ${cleanName}; when they answer, open the link they send back.`
          : `Couldn’t share the link from this browser.`,
    );
  }

  useEffect(() => {
    document.getElementById('step-title')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
    document.querySelector('.shell')?.scrollTo({ top: 0 });
  }, [step, saved]);

  const cleanName = name.trim();
  const lookalikes = shots.length
    ? people.filter((p) => p.descriptors.some((d) => shots.some((s) => euclidean(d, s.descriptor) < LOOKALIKE))).map((p) => p.name)
    : [];
  const canContinue = [cleanName.length > 0 && !capReached, whisper.trim().length > 0, !!consentMethod, shots.length >= MIN_SHOTS, true][step];
  const TOTAL = 5;

  async function save() {
    setSaving(true);
    const now = new Date().toISOString();
    const person: Person = {
      id: newId(),
      name: cleanName,
      note: note.trim(),
      whisper: whisper.trim(),
      whisperSource: source,
      cues: Object.fromEntries(Object.entries(cues).filter(([, v]) => v && v.trim())) as Cues,
      descriptors: shots.map((s) => s.descriptor),
      thumb: shots[0]?.thumb ?? '',
      consentAt: consentAt.current || now,
      consentMethod: consentMethod ?? 'owner-confirmed',
      child: child || undefined,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await addOrUpdatePerson(person);
      setSaved(person);
      // Enhanced mode (if on): translate and make a natural voice, sending only the text.
      void enrich(person).then((p) => (p !== person ? addOrUpdatePerson(p) : undefined));
    } catch {
      toast('Nothing was saved: this browser is blocking storage.');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setSaved(null);
    setStep(0);
    setName('');
    setConsentMethod(null);
    setConsentTick(false);
    setChild(false);
    setShots([]);
    setNote('');
    setWhisper('');
    setSource('rules');
    setCues({});
  }

  function next() {
    if (!canContinue) return;
    if (step < TOTAL - 1) setStep(step + 1);
    else void save();
  }

  function back() {
    if (step === 3) {
      // The line they agreed to may change, so they'll be asked again.
      setConsentMethod(null);
      setConsentTick(false);
      setStep(1);
      return;
    }
    setStep(step - 1);
  }

  function agree(method: NonNullable<Person['consentMethod']>) {
    consentAt.current = new Date().toISOString();
    setConsentMethod(method);
    setStep(3);
  }

  if (saved) {
    return (
      <main className="screen screen--flow" aria-labelledby="step-title">
        <div className="saved">
          <Avatar src={saved.thumb} name={saved.name} large />
          <h1 id="step-title" tabIndex={-1}>
            {saved.name} is added.
          </h1>
          <p className="lead">Your phone will whisper “{saved.whisper}” when {saved.name} is in view.</p>
        </div>
        <div className="flow-foot" style={{ marginTop: 'auto' }}>
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => {
              unlockAudio();
              navigate('/whisper', true);
            }}
          >
            <Ear size={20} aria-hidden="true" />
            Try Whisper mode
          </button>
          <div className="row">
            <button type="button" className="btn btn--quiet" onClick={reset}>
              <UserPlus size={18} aria-hidden="true" /> Add another
            </button>
            <span className="spacer" />
            <button type="button" className="btn btn--quiet" onClick={() => navigate('/', true)}>
              Done
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="screen screen--flow" aria-labelledby="step-title">
      <div className="flow-head">
        <button
          type="button"
          className="icon-btn"
          onClick={() => (step === 0 ? navigate('/') : back())}
          aria-label={step === 0 ? 'Cancel adding' : 'Back'}
        >
          {step === 0 ? <X size={22} aria-hidden="true" /> : <ChevronLeft size={24} aria-hidden="true" />}
        </button>
        <StepBar step={step} total={TOTAL} />
      </div>

      <form
        className="flow-body"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <div className="step" key={step}>
          {step === 0 && (
            <>
              <div className="stack">
                <h1 tabIndex={-1} id="step-title">
                  Who are you adding?
                </h1>
                <p className="lead">Someone you meet often. Next, you’ll hand them the phone so they can say yes themselves.</p>
              </div>
              <label className="field">
                <span className="field__label">Their name</span>
                <input
                  className="input"
                  name="name"
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
                <input type="checkbox" checked={child} onChange={(e) => setChild(e.target.checked)} />
                <span>
                  <span className="consent__title">{cleanName || 'They'} is a child</span>
                  <span className="consent__body">Children’s faces change fast, so Halo will only ever suggest “Could be {cleanName || 'them'}?”, never say it for sure.</span>
                </span>
              </label>
              {capReached && (
                <p className="notice" role="status">
                  {real.length >= MAX_PEOPLE
                    ? `Halo keeps a short list: at most ${MAX_PEOPLE} people. Remove someone to add another.`
                    : `That’s ${MAX_PER_DAY} people added today. Add more tomorrow: a short list stays reliable.`}
                </p>
              )}
            </>
          )}

          {step === 2 && (
            <div className="handoff">
              <p className="handoff__note">Hand the phone to {cleanName}</p>
              <h1 tabIndex={-1} id="step-title">
                Hi {cleanName}.
              </h1>
              <p className="lead">
                The person holding this phone finds faces hard to recognise, even friends’. With your OK, this phone learns your face and quietly
                reminds them who you are, like this:
              </p>
              <blockquote className="handoff__line">“{whisper}”</blockquote>
              <ul className="promises">
                <li>
                  <Lock size={20} aria-hidden="true" />
                  <div>
                    <b>Your face stays on this phone</b>
                    <span>Nothing is uploaded or shared.</span>
                  </div>
                </li>
                <li>
                  <Trash2 size={20} aria-hidden="true" />
                  <div>
                    <b>Change your mind any time</b>
                    <span>Ask, and they delete you in one tap.</span>
                  </div>
                </li>
              </ul>
              <label className="consent">
                <input type="checkbox" checked={consentTick} onChange={(e) => setConsentTick(e.target.checked)} />
                <span>
                  <span className="consent__title">I’m {cleanName}, and I agree</span>
                  <span className="consent__body">Three photos of my face and this line stay on this phone. I can ask for them to be deleted any time.</span>
                </span>
              </label>
              <button type="button" className="btn btn--primary btn--block" disabled={!consentTick} onClick={() => agree('in-person')}>
                I agree
              </button>
              <div className="row">
                <button type="button" className="btn btn--quiet" onClick={() => navigate('/')}>
                  No thanks
                </button>
                <span className="spacer" />
                <button type="button" className="btn btn--quiet" onClick={() => agree('owner-confirmed')}>
                  They already said yes
                </button>
              </div>
              <button type="button" className="btn btn--block" onClick={sendLink}>
                Not here? Send {cleanName} a link to answer
              </button>
              {linkStatus && (
                <p className="label" role="status">
                  {linkStatus}
                </p>
              )}
            </div>
          )}

          {step === 3 && <PhotoStep name={cleanName} shots={shots} setShots={setShots} />}

          {step === 1 && (
            <NoteStep name={cleanName} note={note} setNote={setNote} whisper={whisper} setWhisper={setWhisper} source={source} setSource={setSource} />
          )}

          {step === 4 && (
            <>
              <div className="stack">
                <h1 tabIndex={-1} id="step-title">
                  How can you spot {cleanName}?
                </h1>
                <p className="lead">Optional. Clothes, hair or a voice often help more than a face. They show under the whisper.</p>
              </div>
              {lookalikes.length > 0 && (
                <p className="notice" role="status">
                  {cleanName} looks a lot like {lookalikes.join(' and ')}. Relatives and look-alikes can be mixed up, so Halo will only speak when it’s
                  clearly one of them. Cue notes help you tell them apart.
                </p>
              )}
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
            </>
          )}
        </div>

        {step !== 2 && (
        <div className="flow-foot">
          <button type="submit" className="btn btn--primary btn--block" disabled={!canContinue || saving} aria-busy={saving}>
            {step === TOTAL - 1 ? (saving ? 'Saving…' : `Save ${cleanName}`) : 'Continue'}
          </button>
          {step === 3 && (
            <p className="field__hint" style={{ textAlign: 'center' }}>
              {shots.length < MIN_SHOTS
                ? `${MIN_SHOTS - shots.length} more ${MIN_SHOTS - shots.length === 1 ? 'photo' : 'photos'} to go. Only fingerprints and one small picture are kept.`
                : 'Only face fingerprints and one small picture are kept.'}
            </p>
          )}
        </div>
        )}
      </form>
    </main>
  );
}
