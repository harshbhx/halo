// Renders the PNG app icons from public/icon.svg with Playwright's Chromium.
// Run once after changing the icon: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const svg = readFileSync('public/icon.svg', 'utf8');
mkdirSync('public/icons', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
const sizes = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['apple-touch-icon.png', 180, 0],
  // Maskable: the mark inside the safe zone on a full-bleed square.
  ['maskable-512.png', 512, 0.12],
];
for (const [file, size, pad] of sizes) {
  const inner = Math.round(size * (1 - pad * 2));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:${pad ? '#141a2c' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px">` +
      svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `) +
      '</body></html>',
  );
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: !pad });
}
await browser.close();
console.log('icons written to public/icons');
