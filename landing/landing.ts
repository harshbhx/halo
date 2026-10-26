/**
 * The landing page's few live parts. Everything here is extra: with scripting
 * off the page reads complete (the whisper buttons stay hidden).
 */
import { makeWhisper } from '../src/lib/whisper';
import { spokenLine, type WhisperStyle } from '../src/lib/whisperStyle';
import { drawLamps } from '../src/lib/lights';

document.documentElement.classList.add('js');

/** Hallmark's slot helper: swap a product capture for another file without touching the layout. */
(window as unknown as { hallmarkSlots: (m: Record<string, string | { src: string; alt?: string }>) => void }).hallmarkSlots = (m) => {
  for (const [k, v] of Object.entries(m)) {
    const slot = document.querySelector<HTMLElement>(`[data-slot="${k}"]`);
    if (!slot) continue;
    const im = new Image();
    im.src = typeof v === 'string' ? v : v.src;
    im.alt = (typeof v === 'object' && v.alt) || slot.dataset.alt || '';
    slot.querySelectorAll(':scope > img').forEach((o) => o.remove());
    slot.prepend(im);
  }
};
document.querySelectorAll<HTMLImageElement>('[data-slot] img').forEach((i) => {
  if (i.complete && !i.naturalWidth) i.remove();
  else i.addEventListener('error', () => i.remove(), { once: true });
});

const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let volume = 0.7;
let rate = 0.95;

function say(text: string): void {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.volume = volume;
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

function ready(fn: () => void) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}

ready(() => {
  /* The banner and bar slide away on the way down and return on the way up. */
  const mast = document.querySelector<HTMLElement>('[data-masthead]');
  let lastY = window.scrollY;
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (mast) mast.toggleAttribute('data-hidden', y > lastY && y > 240);
        lastY = y;
        ticking = false;
      });
    },
    { passive: true },
  );
  mast?.addEventListener('focusin', () => mast.removeAttribute('data-hidden'));

  /* Hear a whisper: the browser's own voice says a real line. */
  const said = document.querySelector<HTMLElement>('[data-said]');
  document.querySelectorAll<HTMLButtonElement>('[data-hear]').forEach((btn) => {
    if (canSpeak) btn.hidden = false;
    btn.addEventListener('click', () => {
      const line = btn.dataset.hear ?? '';
      say(line);
      if (said) said.textContent = `“${line}”`;
    });
  });

  /* The note box: the app's own rules turn a note into a whisper, as you type. */
  const note = document.querySelector<HTMLTextAreaElement>('#note-input');
  const out = document.querySelector<HTMLElement>('[data-whisper]');
  const hearNote = document.querySelector<HTMLButtonElement>('[data-hear-note]');
  const nameOf = (text: string) => /(?:this is|that's|that’s|meet)\s+([A-Z][\p{L}'-]+)/iu.exec(text)?.[1] ?? /\b([A-Z][\p{L}'-]+)/u.exec(text)?.[1] ?? 'They';
  const update = () => {
    if (!note || !out) return;
    out.textContent = makeWhisper(nameOf(note.value), note.value) || '…';
  };
  note?.addEventListener('input', update);
  update();
  if (hearNote && canSpeak) {
    hearNote.hidden = false;
    hearNote.addEventListener('click', () => say(out?.textContent ?? ''));
  }

  /* The instrument: style, volume and speed, then Listen. */
  const sample = { name: 'Raj', whisper: 'Raj, your neighbour. Knee surgery last month.', cues: { clothes: 'Green parka', glasses: 'Round glasses' } };
  const line = document.querySelector<HTMLElement>('[data-line]');
  const styleOf = () => (document.querySelector<HTMLInputElement>('input[name="style"]:checked')?.value ?? 'short') as WhisperStyle;
  const showLine = () => line && (line.textContent = spokenLine(sample, styleOf()));
  document.querySelectorAll<HTMLInputElement>('input[name="style"]').forEach((r) => r.addEventListener('change', showLine));
  showLine();
  const bindFader = (id: string, outSel: string, set: (v: number) => void, fmt: (v: number) => string) => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    const output = document.querySelector<HTMLOutputElement>(outSel);
    if (!input) return;
    const apply = () => {
      const v = Number(input.value);
      set(v);
      input.style.setProperty('--level', `${((v - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100}%`);
      if (output) output.textContent = fmt(v);
    };
    input.addEventListener('input', apply);
    apply();
  };
  bindFader('volume', '[data-volume-out]', (v) => (volume = v / 100), (v) => String(v));
  bindFader('rate', '[data-rate-out]', (v) => (rate = v / 100), (v) => (v / 100).toFixed(2));
  const listen = document.querySelector<HTMLButtonElement>('[data-listen]');
  if (listen && canSpeak) {
    listen.hidden = false;
    listen.addEventListener('click', () => say(line?.textContent ?? ''));
  }

  /* The hour drawn as light: a far horizon in the hero, the same stars over the promise. Drawn once, still. */
  const canvases = document.querySelectorAll<HTMLCanvasElement>('[data-hour]');
  const drawHour = () =>
    canvases.forEach((c) => drawLamps(c, c.dataset.hour === 'stars' ? { low: 1.25, town: false } : {}));
  drawHour();
  // Redraw whenever a canvas changes size, so the stars are never stretched.
  let queued = 0;
  const redraw = () => {
    cancelAnimationFrame(queued);
    queued = requestAnimationFrame(drawHour);
  };
  if (typeof ResizeObserver === 'function') {
    const watch = new ResizeObserver(redraw);
    canvases.forEach((c) => watch.observe(c));
  } else addEventListener('resize', redraw);
});
