import { Info, Pause, Play, RefreshCw, Sparkles, SwitchCamera, UserPlus, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalBadge, toast } from '../components/ui';
import { CAMERA_MESSAGES, CameraError, openCamera, stopStream, type CameraProblem } from '../lib/camera';
import { createDemoStream, loadSamplePeople, SAMPLE_AVAILABLE } from '../lib/demo';
import { detectAll, engineBackend, frameBrightness, loadEngine } from '../lib/faceEngine';
import { HINT_TEXT, HintSmoother, pickHint, yawFrom, type Hint } from '../lib/hints';
import { bestMatch, resolveFrame, THRESHOLDS, Tracker, type Match } from '../lib/matcher';
import { usePeople } from '../lib/people';
import { navigate } from '../lib/router';
import { getSettings, updateSettings, useSettings } from '../lib/settings';
import { useToday } from '../lib/stores';
import type { Person } from '../lib/types';
import { deliver, stopSpeaking, unlockAudio } from '../lib/voice';
import { cueItems, spokenLine } from '../lib/whisperStyle';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TrackedFace {
  key: string;
  target: Box;
  shown: Box;
  match: Match;
  confirmed: boolean;
  confirmedAt: number;
  seenAt: number;
}

type Phase = 'starting' | 'running' | 'camera-error' | 'engine-error';

interface Palette {
  halo: string;
  haloSoft: string;
  haloInk: string;
  unknown: string;
  scrim: string;
  ink: string;
  display: string;
  body: string;
}

/** Colours and faces come from the design tokens, never literals in code. */
function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    halo: v('--halo'),
    haloSoft: v('--halo-soft'),
    haloInk: v('--halo-ink'),
    unknown: v('--halo-unknown'),
    scrim: v('--night-scrim'),
    ink: v('--night-ink'),
    display: v('--font-display'),
    body: v('--font-body'),
  };
}

/** Map a box in video pixels to the element (object-fit: cover, optional mirror). */
function toScreen(box: Box, video: { w: number; h: number }, view: { w: number; h: number }, mirror: boolean) {
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
  const { list: today } = useToday();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const facesRef = useRef<TrackedFace[]>([]);
  const peopleRef = useRef<Person[]>(people);
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);
  const speakingRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const trackerRef = useRef(new Tracker({ need: 3, window: 4, cooldownMs: settings.repeatSeconds * 1000 }));
  const smootherRef = useRef(new HintSmoother(4));
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
  const [hint, setHint] = useState<Hint | null>(null);
  const [preparingSamples, setPreparingSamples] = useState(false);

  const mirror = !demo && settings.facing === 'user';
  const hasPeople = people.length > 0;
  const whispersOff = settings.whispersPaused;

  peopleRef.current = people;
  captionIdRef.current = captionId;
  pausedRef.current = paused;
  mutedRef.current = muted || whispersOff;

  useEffect(() => {
    trackerRef.current.setCooldown(settings.repeatSeconds * 1000);
  }, [settings.repeatSeconds]);

  // Phones stop the camera when the screen locks; restart it on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const stream = videoRef.current?.srcObject as MediaStream | null;
      const ended = !stream || stream.getVideoTracks().every((t) => t.readyState === 'ended');
      if (ended && phase === 'running') setAttempt((a) => a + 1);
      else void videoRef.current?.play().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [phase]);

  // Unlock speech and audio on the first touch (mobile browsers need a gesture).
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
    try {
      await deliver(spokenLine(person, s.whisperStyle), s.outputMode, {
        voiceName: s.voiceName,
        volume: s.volume,
        rate: s.rate,
        chimeSound: s.chimeSound,
        haptics: s.haptics,
      });
    } finally {
      speakingRef.current = false;
      void pumpSpeech();
    }
  }, []);

  // Camera (or the demo camera) and the face engine, then the detection loop.
  useEffect(() => {
    if (!loaded || (!hasPeople && !demo)) return;
    let stream: MediaStream | null = null;
    let stopDemo: (() => void) | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setPhase('starting');
    setProblem(null);

    async function start() {
      try {
        if (demo) {
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
      let frames = 0;
      let light = 128;

      const tick = async () => {
        if (cancelled) return;
        const v = videoRef.current;
        let delay = 120;
        if (v && !pausedRef.current && v.readyState >= 2 && v.videoWidth > 0) {
          const started = performance.now();
          try {
            const detected = await detectAll(v, inputSize);
            if (cancelled) return;
            if (frames % 5 === 0) light = frameBrightness(v);
            frames += 1;
            const threshold = THRESHOLDS[getSettings().strictness];
            const enrolled = peopleRef.current.map((p) => ({ id: p.id, descriptors: p.descriptors }));
            const frame = resolveFrame(detected.map((d) => ({ box: d.box, marks: d.marks, match: bestMatch(d.descriptor, enrolled, threshold) })));
            // The fingerprints of these faces are dropped here: only boxes and match results are kept.
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

            // The caption is only for someone in view now. If a face we don't know replaces
            // its person, it goes at once so the stranger is never mistaken for them.
            const shown = captionIdRef.current;
            if (shown && update.confirmed.has(shown)) captionSeenRef.current = now;
            else if (shown && frame.some((f) => !f.match.personId)) captionSeenRef.current = 0;
            const newlyConfirmed = [...update.confirmed].filter((id) => !confirmedRef.current.has(id));
            confirmedRef.current = update.confirmed;
            if (newlyConfirmed.length && !update.toSpeak.includes(newlyConfirmed[0])) {
              captionIdRef.current = newlyConfirmed[0];
              captionSeenRef.current = now;
              setCaptionId(newlyConfirmed[0]);
            }

            const unmatched = frame.filter((f) => !f.match.personId);
            setFaceCount({ known: update.confirmed.size, unknown: unmatched.length });
            setHint(
              smootherRef.current.push(
                update.confirmed.size
                  ? null
                  : pickHint({
                      brightness: light,
                      anyFace: frame.length > 0,
                      unmatched: unmatched.map((f) => ({
                        widthShare: f.box.width / v.videoWidth,
                        yaw: yawFrom(f.marks.nose, f.marks.leftEye, f.marks.rightEye),
                      })),
                    }),
              ),
            );
            for (const id of update.toSpeak) if (!queueRef.current.includes(id)) queueRef.current.push(id);
            void pumpSpeech();
            if (import.meta.env.DEV || (window as unknown as { __fwDebug?: boolean }).__fwDebug) {
              (window as unknown as { __fwPerf?: unknown }).__fwPerf = { backend: engineBackend(), detectMs: Math.round(performance.now() - started), light: Math.round(light) };
              (window as unknown as { __fwLastFrame?: unknown }).__fwLastFrame = frame.map((f) => ({
                personId: f.match.personId,
                distance: Number(f.match.distance.toFixed(3)),
                runnerUp: Number(f.match.runnerUp.toFixed(3)),
              }));
            }
          } catch {
            // A bad frame is skipped; the next one is read.
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
  }, [loaded, hasPeople, demo, settings.facing, attempt, pumpSpeech]);

  // Drawing: rings glide toward the latest detection, and bloom when someone is recognised.
  useEffect(() => {
    let raf = 0;
    let palette = readPalette();
    const repalette = () => (palette = readPalette());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', repalette);
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
          const age = now - face.confirmedAt;
          const t = reduce ? 1 : Math.min(age / 520, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          const grow = 1 + (1 - ease) * 0.18;
          // The bloom: two soft ripples leave the face once, then the halo settles.
          if (!reduce && age < 1100) {
            for (const delay of [0, 220]) {
              const p = Math.min(Math.max((age - delay) / 880, 0), 1);
              if (p <= 0 || p >= 1) continue;
              ctx.save();
              ctx.globalAlpha = (1 - p) * 0.55;
              ctx.strokeStyle = palette.halo;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.ellipse(cx, cy, rx * (1 + p * 0.55), ry * (1 + p * 0.55), 0, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          }
          ctx.save();
          ctx.globalAlpha = 0.3 + 0.7 * ease;
          ctx.strokeStyle = palette.haloSoft;
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx * grow, ry * grow, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = palette.halo;
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.restore();

          const person = peopleRef.current.find((p) => p.id === face.match.personId);
          if (person) {
            ctx.save();
            ctx.globalAlpha = ease;
            ctx.font = `500 20px ${palette.display}`;
            const tw = ctx.measureText(person.name).width;
            const pw = tw + 32;
            const ph = 40;
            const px = Math.min(Math.max(cx - pw / 2, 8), vw - pw - 8);
            let py = cy - ry * grow - ph - 10;
            if (py < 128) py = Math.max(cy - ry * grow + 14, 128);
            py = Math.min(py, vh - 340);
            ctx.fillStyle = palette.halo;
            roundRect(ctx, px, py, pw, ph, ph / 2);
            ctx.fill();
            ctx.fillStyle = palette.haloInk;
            ctx.textBaseline = 'middle';
            ctx.fillText(person.name, px + 16, py + ph / 2 + 1);
            ctx.restore();
          }
        } else if (face.match.personId) {
          // Possibly someone you know: a faint dotted ring while it makes sure.
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.strokeStyle = palette.halo;
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 9]);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.strokeStyle = palette.unknown;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 10]);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = `700 15px ${palette.body}`;
          const label = 'Not someone you’ve added';
          const tw = ctx.measureText(label).width;
          const pw = tw + 24;
          const ph = 32;
          const px = Math.min(Math.max(cx - pw / 2, 8), vw - pw - 8);
          const py = Math.min(cy + ry + 10, vh - ph - 8);
          ctx.fillStyle = palette.scrim;
          roundRect(ctx, px, py, pw, ph, ph / 2);
          ctx.fill();
          ctx.fillStyle = palette.ink;
          ctx.textBaseline = 'middle';
          ctx.fillText(label, px + 12, py + ph / 2 + 1);
          ctx.restore();
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener('change', repalette);
    };
  }, [mirror]);

  const caption = useMemo(() => people.find((p) => p.id === captionId) ?? null, [people, captionId]);
  const onToday = caption && today?.ids.includes(caption.id);

  function repeatCaption() {
    if (!caption) return;
    unlockAudio();
    trackerRef.current.forget(caption.id);
    if (!queueRef.current.includes(caption.id)) queueRef.current.unshift(caption.id);
    void pumpSpeech();
  }

  async function addSamples() {
    setPreparingSamples(true);
    try {
      await loadSamplePeople();
      navigate('/whisper?demo=1', true);
    } catch {
      toast('The sample people didn’t load. Try again.');
    } finally {
      setPreparingSamples(false);
    }
  }

  const statusText = paused
    ? 'Paused'
    : faceCount.known > 0
      ? `${faceCount.known === 1 ? 'Someone' : `${faceCount.known} people`} you know`
      : faceCount.unknown > 0
        ? 'No one you’ve added'
        : 'Looking for people you’ve added';

  return (
    <main className="night" aria-label="Whisper mode">
      <video ref={videoRef} className={mirror ? 'mirror' : undefined} muted playsInline autoPlay aria-hidden="true" />
      <canvas ref={canvasRef} aria-hidden="true" />

      <div className="night__top">
        <button type="button" className="night-btn" onClick={() => (stopSpeaking(), navigate('/'))} aria-label="Close Whisper mode">
          <X size={24} aria-hidden="true" />
        </button>
        <span className="spacer" />
        <LocalBadge />
      </div>

      {phase === 'running' && (
        <div className="night__status" aria-live="polite">
          {statusText}
          {demo && <span className="tag tag--sample">Demo camera</span>}
        </div>
      )}

      {loaded && !hasPeople && !demo && (
        <div className="night__panel">
          <div>
            <h2>Add someone first</h2>
            <p>Whisper mode only recognises people you’ve added with their agreement.</p>
            <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/enrol')}>
              <UserPlus size={20} aria-hidden="true" /> Add someone
            </button>
            {SAMPLE_AVAILABLE && (
              <button type="button" className="btn btn--block" onClick={addSamples} disabled={preparingSamples} aria-busy={preparingSamples}>
                <Sparkles size={20} aria-hidden="true" />
                {preparingSamples ? 'Preparing sample people…' : 'Try with sample people'}
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'starting' && (hasPeople || demo) && (
        <div className="night__panel">
          <div>
            <h2>Getting ready on your phone…</h2>
            <div className="loader" aria-hidden="true">
              <span style={{ transform: `scaleX(${Math.max(0.06, progress)})` }} />
            </div>
            <p>The face reader runs here, on this device. Nothing is uploaded.</p>
            <p>One earbud in, phone held at chest height.</p>
          </div>
        </div>
      )}

      {phase === 'camera-error' && problem && (
        <div className="night__panel" role="alert">
          <div>
            <h2>{CAMERA_MESSAGES[problem].title}</h2>
            <p>{CAMERA_MESSAGES[problem].body}</p>
            <button type="button" className="btn btn--block" onClick={() => setAttempt((a) => a + 1)}>
              <RefreshCw size={20} aria-hidden="true" /> Try the camera again
            </button>
            {SAMPLE_AVAILABLE && people.some((p) => p.sample) && (
              <button type="button" className="btn btn--block" onClick={() => navigate('/whisper?demo=1')}>
                Use the demo camera
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'engine-error' && (
        <div className="night__panel" role="alert">
          <div>
            <h2>The face reader couldn’t start</h2>
            <p>This browser couldn’t run the on-device face model. An up-to-date Chrome, Safari or Firefox can.</p>
          </div>
        </div>
      )}

      <div className="night__bottom">
        {whispersOff && phase === 'running' && (
          <button type="button" className="paused-banner" onClick={() => updateSettings({ whispersPaused: false })}>
            Whispers paused. Tap to turn them back on.
          </button>
        )}
        {hint && !caption && phase === 'running' && (
          <p className="night__hint" role="status">
            <Info size={16} aria-hidden="true" />
            {HINT_TEXT[hint]}
          </p>
        )}
        {caption && phase === 'running' && (
          <button type="button" className="caption" key={caption.id} onClick={repeatCaption} aria-live="polite">
            <span className="caption__who">
              {caption.thumb && <img className="caption__avatar" src={caption.thumb} alt="" width={44} height={44} />}
              <span className="caption__name">{caption.name}</span>
              {onToday && <span className="tag tag--sample">On today’s list</span>}
            </span>
            <span className="caption__text">{caption.whisper}</span>
            {cueItems(caption.cues).length > 0 && (
              <ul className="caption__cues">
                {cueItems(caption.cues).map((c) => (
                  <li key={c.kind}>
                    {c.label}: <b>{c.text}</b>
                  </li>
                ))}
              </ul>
            )}
            <span className="caption__hint">Tap to hear it again</span>
          </button>
        )}

        {phase === 'running' && (
          <>
            <div className="controls">
              <button
                type="button"
                className="night-btn"
                aria-pressed={muted}
                onClick={() => {
                  setMuted((m) => !m);
                  stopSpeaking();
                }}
                aria-label={muted ? 'Unmute whispers' : 'Mute whispers'}
              >
                {muted ? <VolumeX size={24} aria-hidden="true" /> : <Volume2 size={24} aria-hidden="true" />}
              </button>
              <button type="button" className="night-btn night-btn--lg" aria-pressed={paused} onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Resume' : 'Pause'}>
                {paused ? <Play size={28} aria-hidden="true" /> : <Pause size={28} aria-hidden="true" />}
              </button>
              <button
                type="button"
                className="night-btn"
                onClick={() => updateSettings({ facing: getSettings().facing === 'user' ? 'environment' : 'user' })}
                aria-label="Switch camera"
                disabled={demo}
              >
                <SwitchCamera size={24} aria-hidden="true" />
              </button>
            </div>
            <p className="limits">Light and angles can fool it. Never use it for safety or security decisions.</p>
          </>
        )}
      </div>
    </main>
  );
}
