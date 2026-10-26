import { Pause, Play, RefreshCw, Sparkles, SwitchCamera, UserPlus, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PrivacyBadge, toast } from '../components/ui';
import { CAMERA_MESSAGES, CameraError, openCamera, stopStream, type CameraProblem } from '../lib/camera';
import { createDemoStream, SAMPLE_AVAILABLE, loadSamplePeople } from '../lib/demo';
import { detectAll, engineBackend, loadEngine } from '../lib/faceEngine';
import { bestMatch, resolveFrame, THRESHOLDS, Tracker, type Match } from '../lib/matcher';
import { usePeople } from '../lib/people';
import { navigate } from '../lib/router';
import { getSettings, updateSettings, useSettings } from '../lib/settings';
import type { Person } from '../lib/types';
import { speak, stopSpeaking, unlockAudio } from '../lib/voice';
import { cueLine } from '../lib/whisper';

interface TrackedFace {
  key: string;
  target: { x: number; y: number; width: number; height: number };
  shown: { x: number; y: number; width: number; height: number };
  match: Match;
  confirmed: boolean;
  confirmedAt: number;
  seenAt: number;
}

type Phase = 'starting' | 'running' | 'camera-error' | 'engine-error';

const RING = '#7be3c6';

/** Map a box in video pixels to the on-screen element (object-fit: cover, optional mirror). */
function toScreen(
  box: TrackedFace['shown'],
  video: { w: number; h: number },
  view: { w: number; h: number },
  mirror: boolean,
) {
  const scale = Math.max(view.w / video.w, view.h / video.h);
  const ox = (view.w - video.w * scale) / 2;
  const oy = (view.h - video.h * scale) / 2;
  let x = box.x * scale + ox;
  const y = box.y * scale + oy;
  const w = box.width * scale;
  const h = box.height * scale;
  if (mirror) x = view.w - x - w;
  return { x, y, w, h };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function WhisperMode({ demo }: { demo: boolean }) {
  const settings = useSettings();
  const { loaded, people } = usePeople();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const facesRef = useRef<TrackedFace[]>([]);
  const peopleRef = useRef<Person[]>(people);
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);
  const speakingRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const trackerRef = useRef(new Tracker({ need: 3, window: 4, cooldownMs: settings.repeatSeconds * 1000 }));
  const captionSeenRef = useRef(0);
  const confirmedRef = useRef<Set<string>>(new Set());
  const captionIdRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>('starting');
  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captionId, setCaptionId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [faceCount, setFaceCount] = useState({ known: 0, unknown: 0 });
  const [preparingSamples, setPreparingSamples] = useState(false);

  const useDemo = demo;
  const mirror = !useDemo && settings.facing === 'user';
  const hasPeople = people.length > 0;

  peopleRef.current = people;
  captionIdRef.current = captionId;
  pausedRef.current = paused;
  mutedRef.current = muted;

  useEffect(() => {
    trackerRef.current.setCooldown(settings.repeatSeconds * 1000);
  }, [settings.repeatSeconds]);

  // Unlock speech/audio on the first touch inside Whisper mode (mobile browsers need a gesture).
  useEffect(() => {
    const once = () => unlockAudio();
    window.addEventListener('pointerdown', once, { once: true });
    return () => window.removeEventListener('pointerdown', once);
  }, []);

  const pumpSpeech = useCallback(async () => {
    if (speakingRef.current) return;
    const id = queueRef.current.shift();
    if (!id) return;
    const person = peopleRef.current.find((p) => p.id === id);
    if (!person) return void pumpSpeech();
    captionIdRef.current = id;
    setCaptionId(id);
    captionSeenRef.current = performance.now();
    if (mutedRef.current) return void pumpSpeech();
    speakingRef.current = true;
    const s = getSettings();
    // A tiny tap on phones that support it, so a whisper never comes out of nowhere.
    try {
      navigator.vibrate?.(25);
    } catch {
      // not supported
    }
    try {
      await speak(person.whisper, { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chime: s.chime });
    } finally {
      speakingRef.current = false;
      void pumpSpeech();
    }
  }, []);

  // Camera (or demo camera) + face engine, then the detection loop.
  useEffect(() => {
    if (!loaded || (!hasPeople && !useDemo)) return;
    let stream: MediaStream | null = null;
    let stopDemo: (() => void) | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setPhase('starting');
    setProblem(null);

    async function start() {
      try {
        if (useDemo) {
          const demoStream = await createDemoStream();
          stream = demoStream.stream;
          stopDemo = demoStream.stop;
        } else {
          stream = await openCamera(getSettings().facing);
        }
      } catch (err) {
        if (cancelled) return;
        setProblem(err instanceof CameraError ? err.problem : 'unknown');
        setPhase('camera-error');
        return;
      }
      if (cancelled) return stopStream(stream);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      try {
        await loadEngine(setProgress);
      } catch {
        if (!cancelled) setPhase('engine-error');
        return;
      }
      if (cancelled) return;
      setPhase('running');
      const inputSize = engineBackend() === 'webgl' ? 320 : 224;

      const tick = async () => {
        if (cancelled) return;
        const v = videoRef.current;
        let delay = 120;
        if (v && !pausedRef.current && v.readyState >= 2 && v.videoWidth > 0) {
          const started = performance.now();
          try {
            const detected = await detectAll(v, inputSize);
            if (cancelled) return;
            const threshold = THRESHOLDS[getSettings().strictness];
            const enrolled = peopleRef.current.map((p) => ({ id: p.id, descriptors: p.descriptors }));
            const frame = resolveFrame(
              detected.map((d) => ({ box: d.box, match: bestMatch(d.descriptor, enrolled, threshold) })),
            );
            // Fingerprints of the faces are dropped here: only boxes and match results are kept.
            const now = performance.now();
            const update = trackerRef.current.update(
              frame.flatMap((f) => (f.match.personId ? [f.match.personId] : [])),
              now,
            );
            const previous = facesRef.current;
            facesRef.current = frame.map((f, i) => {
              const key = f.match.personId ?? `unknown-${i}`;
              const old = previous.find((p) => p.key === key);
              const confirmed = !!f.match.personId && update.confirmed.has(f.match.personId);
              return {
                key,
                target: f.box,
                shown: old ? old.shown : { ...f.box },
                match: f.match,
                confirmed,
                confirmedAt: confirmed ? (old?.confirmed ? old.confirmedAt : now) : 0,
                seenAt: now,
              };
            });
            // The caption is only for someone in view right now. If its person has gone and a
            // face we don't know is there instead, hide it at once so the stranger is never
            // mistaken for them.
            const shown = captionIdRef.current;
            if (shown && update.confirmed.has(shown)) captionSeenRef.current = now;
            else if (shown && frame.some((f) => !f.match.personId)) captionSeenRef.current = 0;
            // The caption follows whoever was just recognised, even inside the repeat
            // interval (speech waits for the interval, the caption doesn't).
            const newlyConfirmed = [...update.confirmed].filter((id) => !confirmedRef.current.has(id));
            confirmedRef.current = update.confirmed;
            if (newlyConfirmed.length && !update.toSpeak.includes(newlyConfirmed[0])) {
              captionIdRef.current = newlyConfirmed[0];
              captionSeenRef.current = now;
              setCaptionId(newlyConfirmed[0]);
            }
            setFaceCount({
              known: update.confirmed.size,
              unknown: frame.filter((f) => !f.match.personId).length,
            });
            for (const id of update.toSpeak) if (!queueRef.current.includes(id)) queueRef.current.push(id);
            void pumpSpeech();
            if (import.meta.env.DEV || (window as unknown as { __fwDebug?: boolean }).__fwDebug) {
              (window as unknown as { __fwPerf?: unknown }).__fwPerf = {
                backend: engineBackend(),
                detectMs: Math.round(performance.now() - started),
              };
              (window as unknown as { __fwLastFrame?: unknown }).__fwLastFrame = frame.map((f) => ({
                personId: f.match.personId,
                distance: Number(f.match.distance.toFixed(3)),
                runnerUp: Number(f.match.runnerUp.toFixed(3)),
              }));
            }
          } catch {
            // A bad frame is skipped; the next one will be read.
          }
          delay = Math.max(60, (performance.now() - started) * 0.4);
        }
        timer = setTimeout(tick, delay);
      };
      void tick();
    }

    void start();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopStream(stream);
      stopDemo?.();
      stopSpeaking();
      facesRef.current = [];
      queueRef.current = [];
      confirmedRef.current = new Set();
      trackerRef.current.reset();
    };
  }, [loaded, hasPeople, useDemo, settings.facing, attempt, pumpSpeech]);

  // Drawing loop: rings glide toward the latest detection and "breathe in" when confirmed.
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = canvas.clientWidth;
      const vh = canvas.clientHeight;
      if (canvas.width !== Math.round(vw * dpr) || canvas.height !== Math.round(vh * dpr)) {
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      if (!video.videoWidth) return;
      const now = performance.now();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Captions go once their person has been out of view for a moment.
      if (now - captionSeenRef.current > 2500) setCaptionId((c) => (c ? null : c));

      for (const face of facesRef.current) {
        if (now - face.seenAt > 1200) continue;
        const k = reduce ? 1 : 0.28;
        face.shown = {
          x: face.shown.x + (face.target.x - face.shown.x) * k,
          y: face.shown.y + (face.target.y - face.shown.y) * k,
          width: face.shown.width + (face.target.width - face.shown.width) * k,
          height: face.shown.height + (face.target.height - face.shown.height) * k,
        };
        const r = toScreen(face.shown, { w: video.videoWidth, h: video.videoHeight }, { w: vw, h: vh }, mirror);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2 - r.h * 0.06;
        const rx = r.w * 0.6;
        const ry = r.h * 0.8;

        if (face.confirmed) {
          const t = reduce ? 1 : Math.min((now - face.confirmedAt) / 520, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          const grow = 1 + (1 - ease) * 0.22;
          ctx.save();
          ctx.globalAlpha = 0.25 + 0.75 * ease;
          ctx.shadowColor = RING;
          ctx.shadowBlur = 28;
          ctx.strokeStyle = RING;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx * grow, ry * grow, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 0.18 * ease;
          ctx.lineWidth = 14;
          ctx.stroke();
          ctx.restore();

          const person = peopleRef.current.find((p) => p.id === face.match.personId);
          if (person) {
            ctx.save();
            ctx.globalAlpha = ease;
            ctx.font = '800 19px "Atkinson Hyperlegible Next", system-ui, sans-serif';
            const label = person.name;
            const tw = ctx.measureText(label).width;
            const pw = tw + 32;
            const ph = 38;
            const px = Math.min(Math.max(cx - pw / 2, 8), vw - pw - 8);
            // Above the ring when there's room, otherwise just inside its top edge;
            // never down where the caption card sits.
            let py = cy - ry * grow - ph - 10;
            if (py < 128) py = Math.max(cy - ry * grow + 14, 128);
            py = Math.min(py, vh - 320);
            ctx.fillStyle = RING;
            roundRect(ctx, px, py, pw, ph, 19);
            ctx.fill();
            ctx.fillStyle = '#08241e';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, px + 16, py + ph / 2 + 1);
            ctx.restore();
          }
        } else if (face.match.personId) {
          // Possibly someone you know: a faint ring while we make sure.
          ctx.save();
          ctx.globalAlpha = 0.45;
          ctx.strokeStyle = RING;
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 9]);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 10]);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '700 15px "Atkinson Hyperlegible Next", system-ui, sans-serif';
          const label = "Not someone you've added";
          const tw = ctx.measureText(label).width;
          const pw = tw + 24;
          const ph = 32;
          const px = Math.min(Math.max(cx - pw / 2, 8), vw - pw - 8);
          const py = Math.min(cy + ry + 10, vh - ph - 8);
          ctx.fillStyle = 'rgba(8,12,15,0.55)';
          roundRect(ctx, px, py, pw, ph, 16);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.86)';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, px + 12, py + ph / 2 + 1);
          ctx.restore();
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mirror]);

  const caption = useMemo(() => people.find((p) => p.id === captionId) ?? null, [people, captionId]);

  function repeatCaption() {
    if (!caption) return;
    unlockAudio();
    trackerRef.current.forget(caption.id);
    if (!queueRef.current.includes(caption.id)) queueRef.current.unshift(caption.id);
    void pumpSpeech();
  }

  function close() {
    stopSpeaking();
    navigate('/');
  }

  async function addSamples() {
    setPreparingSamples(true);
    try {
      await loadSamplePeople();
      navigate('/whisper?demo=1', true);
    } catch {
      toast("Sample people couldn't load. Try again.");
    } finally {
      setPreparingSamples(false);
    }
  }

  const statusText = paused
    ? 'Paused'
    : faceCount.known > 0
      ? `${faceCount.known === 1 ? 'Someone' : `${faceCount.known} people`} you know`
      : faceCount.unknown > 0
        ? "No one you've added"
        : "Looking for people you've added";

  return (
    <div className="whisper" role="application" aria-label="Whisper mode">
      <video
        ref={videoRef}
        className={`whisper__video${mirror ? ' whisper__video--mirror' : ''}`}
        muted
        playsInline
        autoPlay
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="whisper__overlay" aria-hidden="true" />
      <div className="whisper__shade" />

      <div className="whisper__top">
        <button type="button" className="round glass" onClick={close} aria-label="Close Whisper mode">
          <X size={26} aria-hidden="true" />
        </button>
        <span className="spacer" />
        <PrivacyBadge />
      </div>

      {phase === 'running' && (
        <div className="whisper__status glass" aria-live="polite">
          {!paused && <span className="status-dot" aria-hidden="true" />}
          {statusText}
          {useDemo && <span className="chip chip--warn">Demo camera</span>}
        </div>
      )}

      {loaded && !hasPeople && !useDemo && (
        <div className="whisper__panel">
          <div className="panel">
            <p className="panel__title">Add someone first</p>
            <p className="panel__body">Whisper mode recognises only people you've added with their agreement.</p>
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => navigate('/enrol')}>
              <UserPlus size={22} aria-hidden="true" /> Add someone
            </button>
            {SAMPLE_AVAILABLE && (
              <button type="button" className="btn btn--secondary btn--block" onClick={addSamples} disabled={preparingSamples}>
                <Sparkles size={20} aria-hidden="true" />
                {preparingSamples ? 'Preparing sample people…' : 'Try with sample people'}
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'starting' && (hasPeople || useDemo) && (
        <div className="whisper__panel">
          <div className="panel">
            <p className="panel__title">Getting ready on your phone…</p>
            <div className="loader" aria-hidden="true">
              <span style={{ width: `${Math.max(6, Math.round(progress * 100))}%` }} />
            </div>
            <p className="panel__body">The face reader runs here, on this device. Nothing is uploaded.</p>
          </div>
        </div>
      )}

      {phase === 'camera-error' && problem && (
        <div className="whisper__panel" role="alert">
          <div className="panel">
            <p className="panel__title">{CAMERA_MESSAGES[problem].title}</p>
            <p className="panel__body">{CAMERA_MESSAGES[problem].body}</p>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => setAttempt((a) => a + 1)}>
              <RefreshCw size={20} aria-hidden="true" /> Try again
            </button>
            {SAMPLE_AVAILABLE && people.some((p) => p.sample) && (
              <button type="button" className="btn btn--ghost btn--block" style={{ color: '#f4f1ea' }} onClick={() => navigate('/whisper?demo=1')}>
                Use the demo camera
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'engine-error' && (
        <div className="whisper__panel" role="alert">
          <div className="panel">
            <p className="panel__title">The face reader couldn't start</p>
            <p className="panel__body">This browser couldn't run the on-device face model. Try an up-to-date Chrome, Safari or Firefox.</p>
          </div>
        </div>
      )}

      <div className="whisper__bottom">
        {caption && phase === 'running' && (
          <button type="button" className="caption glass" key={caption.id} onClick={repeatCaption} aria-live="polite">
            <span className="caption__who">
              {caption.thumb && <img className="caption__avatar" src={caption.thumb} alt="" />}
              <span className="caption__name">{caption.name}</span>
            </span>
            <span className="caption__text" style={{ display: 'block' }}>
              {caption.whisper}
            </span>
            {cueLine(caption.cues) && (
              <span className="caption__cues" style={{ display: 'block' }}>
                {cueLine(caption.cues)}
              </span>
            )}
            <span className="caption__hint" style={{ display: 'block' }}>
              Tap to hear it again
            </span>
          </button>
        )}

        {phase === 'running' && (
          <>
            <div className="controls">
              <button
                type="button"
                className="round glass"
                aria-pressed={muted}
                onClick={() => {
                  setMuted((m) => !m);
                  stopSpeaking();
                }}
                aria-label={muted ? 'Unmute whispers' : 'Mute whispers'}
              >
                {muted ? <VolumeX size={26} aria-hidden="true" /> : <Volume2 size={26} aria-hidden="true" />}
              </button>
              <button
                type="button"
                className="round glass"
                style={{ width: 68, height: 68 }}
                aria-pressed={paused}
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? 'Resume' : 'Pause'}
              >
                {paused ? <Play size={30} aria-hidden="true" /> : <Pause size={30} aria-hidden="true" />}
              </button>
              <button
                type="button"
                className="round glass"
                onClick={() => updateSettings({ facing: getSettings().facing === 'user' ? 'environment' : 'user' })}
                aria-label="Switch camera"
                disabled={useDemo}
              >
                <SwitchCamera size={26} aria-hidden="true" />
              </button>
            </div>
            <p className="limits-note">Can be wrong in poor light or at an angle. Never use it for safety or security decisions.</p>
          </>
        )}
      </div>
    </div>
  );
}
