/**
 * The landing page's few live parts. Everything here is extra: with scripting
 * off the page reads complete (the whisper buttons stay hidden).
 */
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/700.css';
import './landing.css';
import { makeWhisper } from '../src/lib/whisper';
import { spokenLine, type WhisperStyle } from '../src/lib/whisperStyle';

document.documentElement.classList.add('js');

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

  /* The switcher: one panel at a time once scripting runs; all three in order without it. */
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const list = document.querySelector<HTMLElement>('[role="tablist"]');
  if (list && tabs.length) {
    list.hidden = false;
    const select = (tab: HTMLButtonElement, focus = false) => {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls') ?? '');
        if (panel) panel.hidden = !on;
      }
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length], true);
        if (e.key === 'ArrowLeft') select(tabs[(i - 1 + tabs.length) % tabs.length], true);
      });
    });
    select(tabs[0]);
  }

  /* The hour drawn as light: a string of lamps across a terrace at night. Drawn once, still. */
  const canvas = document.querySelector<HTMLCanvasElement>('[data-hour]');
  const css = getComputedStyle(document.documentElement);
  const drawHour = () => {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const lamp = css.getPropertyValue('--halo').trim();
    const wire = css.getPropertyValue('--night-rule').trim();
    // Two strings of lamps, sagging between posts, low on the canvas.
    const strings = [
      { y: h * 0.86, sag: h * 0.06, n: 26, size: 2.6 },
      { y: h * 0.93, sag: h * 0.035, n: 34, size: 1.8 },
    ];
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const s of strings) {
      ctx.strokeStyle = wire;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 60; i += 1) {
        const x = (i / 60) * w;
        const y = s.y + Math.sin((x / w) * Math.PI * 3) * s.sag * 0.5 + s.sag * Math.sin((x / w) * Math.PI);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      for (let i = 0; i < s.n; i += 1) {
        const x = ((i + 0.5) / s.n) * w;
        const y = s.y + Math.sin((x / w) * Math.PI * 3) * s.sag * 0.5 + s.sag * Math.sin((x / w) * Math.PI) + 4;
        const r = s.size * (0.75 + rand() * 0.6);
        ctx.globalAlpha = 0.35 + rand() * 0.55;
        ctx.fillStyle = lamp;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha *= 0.18;
        ctx.beginPath();
        ctx.arc(x, y, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };
  drawHour();
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawHour, 150);
  });
});
