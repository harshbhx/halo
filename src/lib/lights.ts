/**
 * Ribbon's "hour drawn as light": a far horizon at night with a few lit windows
 * and a distant train, drawn once and still. Colours come from the design tokens.
 */
export function drawLamps(canvas: HTMLCanvasElement, options: { low?: number } = {}): void {
  const css = getComputedStyle(document.documentElement);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const lamp = css.getPropertyValue('--halo').trim();
  const land = css.getPropertyValue('--night-paper').trim();
  const ridge = css.getPropertyValue('--night-rule').trim();
  const horizon = h * (options.low ?? 0.9);

  // The land: a low, slightly uneven ridge, darker than the sky.
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  ctx.fillStyle = land;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 24) ctx.lineTo(x, horizon + Math.sin(x / 140) * 4 + Math.sin(x / 37) * 1.5);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ridge;
  ctx.lineWidth = 1;
  ctx.stroke();

  // A few lit windows scattered along the horizon, small and far.
  ctx.fillStyle = lamp;
  for (let i = 0; i < Math.round(w / 60); i += 1) {
    const x = rand() * w;
    ctx.globalAlpha = 0.25 + rand() * 0.45;
    ctx.fillRect(Math.round(x), Math.round(horizon - 3 + rand() * 6), 2, 2);
  }
  // A distant train: one short row of lit windows.
  const start = w * 0.58;
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 14; i += 1) ctx.fillRect(Math.round(start + i * 5), Math.round(horizon - 2), 3, 1.6);
  ctx.globalAlpha = 1;
}
