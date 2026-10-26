/**
 * Ribbon's "hour drawn as light": the small hours over a far horizon. A faint
 * glow where a town sits below the sky, a few stars, lit windows along the ridge
 * and a distant train. Drawn once and still. Colours come from the design tokens.
 */
export function drawLamps(canvas: HTMLCanvasElement, options: { low?: number; town?: boolean } = {}): void {
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
  const sky = css.getPropertyValue('--night-ink').trim();
  const land = css.getPropertyValue('--night-paper').trim();
  const ridgeLine = css.getPropertyValue('--night-rule').trim();
  const horizon = h * (options.low ?? 0.93);
  const town = options.town ?? true;

  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ridgeAt = (x: number) => horizon + Math.sin(x / 140) * 4 + Math.sin(x / 37) * 1.5;

  // Stars: sparse and faint, thinning towards the horizon's glow.
  ctx.fillStyle = sky;
  const stars = Math.round((w * h) / 9000);
  for (let i = 0; i < stars; i += 1) {
    const x = rand() * w;
    const y = Math.pow(rand(), 1.6) * horizon * 0.8;
    ctx.globalAlpha = 0.12 + rand() * 0.38;
    const size = rand() > 0.92 ? 1.6 : 1;
    ctx.fillRect(x, y, size, size);
  }

  // The glow of a town below the horizon, warm and very low.
  if (town) {
    const glow = ctx.createLinearGradient(0, horizon - h * 0.28, 0, horizon);
    glow.addColorStop(0, 'transparent');
    glow.addColorStop(1, lamp);
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon - h * 0.28, w, h * 0.28);
  }
  ctx.globalAlpha = 1;

  // The land: a low, slightly uneven ridge, drawn past both edges so no sky shows at the sides.
  ctx.fillStyle = land;
  ctx.beginPath();
  ctx.moveTo(-40, h + 2);
  for (let x = -40; x <= w + 40; x += 24) ctx.lineTo(x, ridgeAt(x));
  ctx.lineTo(w + 40, ridgeAt(w + 40));
  ctx.lineTo(w + 40, h + 2);
  ctx.closePath();
  ctx.fill();
  // Only the ridge itself gets a hairline, never the sides.
  ctx.strokeStyle = ridgeLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -40; x <= w + 40; x += 24) (x === -40 ? ctx.moveTo(x, ridgeAt(x)) : ctx.lineTo(x, ridgeAt(x)));
  ctx.stroke();

  if (!town) return;
  // A few lit windows scattered along the ridge, small and far.
  ctx.fillStyle = lamp;
  for (let i = 0; i < Math.round(w / 60); i += 1) {
    const x = rand() * w;
    ctx.globalAlpha = 0.25 + rand() * 0.45;
    ctx.fillRect(Math.round(x), Math.round(ridgeAt(x) - 3 + rand() * 6), 2, 2);
  }
  // A distant train: one short row of lit windows.
  const start = w * 0.58;
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 14; i += 1) ctx.fillRect(Math.round(start + i * 5), Math.round(ridgeAt(start) - 2), 3, 1.6);
  ctx.globalAlpha = 1;
}
