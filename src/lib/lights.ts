/**
 * Ribbon's "hour drawn as light": two strings of lamps across a terrace at
 * night, drawn once and still. Colours come from the design tokens.
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
  const wire = css.getPropertyValue('--night-rule').trim();
  const low = options.low ?? 0.86;
  const strings = [
    { y: h * low, sag: h * 0.06, n: Math.max(10, Math.round(w / 52)), size: 2.6 },
    { y: h * Math.min(low + 0.07, 0.97), sag: h * 0.035, n: Math.max(14, Math.round(w / 40)), size: 1.8 },
  ];
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const at = (s: (typeof strings)[number], x: number) => s.y + Math.sin((x / w) * Math.PI * 3) * s.sag * 0.5 + s.sag * Math.sin((x / w) * Math.PI);
  for (const s of strings) {
    ctx.strokeStyle = wire;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 60; i += 1) {
      const x = (i / 60) * w;
      if (i === 0) ctx.moveTo(x, at(s, x));
      else ctx.lineTo(x, at(s, x));
    }
    ctx.stroke();
    for (let i = 0; i < s.n; i += 1) {
      const x = ((i + 0.5) / s.n) * w;
      const y = at(s, x) + 4;
      const r = s.size * (0.75 + rand() * 0.6);
      const alpha = 0.35 + rand() * 0.55;
      ctx.fillStyle = lamp;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.18;
      ctx.beginPath();
      ctx.arc(x, y, r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
