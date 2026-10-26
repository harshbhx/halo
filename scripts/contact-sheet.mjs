// Contact sheets of the evidence screenshots: one image per variant
// (phone or desktop, light or dark) with every screen side by side and its name under it.
// Run after `npm run screens`. Output: docs/shots/contact-sheet-<variant>.png
import { chromium } from '@playwright/test';
import { existsSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const shots = resolve('docs/shots');
const brand = JSON.parse((await import('node:fs')).readFileSync('brand.config.json', 'utf8'));
const variants = ['phone-light', 'phone-dark', 'desktop-light', 'desktop-dark'].filter((v) => existsSync(join(shots, v)));
if (!variants.length) {
  console.error('No screenshots yet: run `npm run screens` first.');
  process.exit(1);
}

const browser = await chromium.launch();
try {
  for (const v of variants) {
    const dir = join(shots, v);
    // The full landing page is very tall; the sheet shows its first screen instead.
    const files = readdirSync(dir).filter((f) => f.endsWith('.png') && f !== '00-landing-full.png').sort();
    const desktop = v.startsWith('desktop');
    const dark = v.endsWith('dark');
    const cell = desktop ? 300 : 170;
    const html = `<!doctype html><meta charset="utf-8"><style>
      body { margin: 0; padding: 32px; background: ${dark ? '#110b08' : '#f6f1e7'}; color: ${dark ? '#f0ebdf' : '#1e1713'}; font: 14px/1.3 system-ui, sans-serif; }
      h1 { margin: 0 0 20px; font-size: 22px; font-weight: 500; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, ${cell}px); gap: 20px 16px; }
      figure { margin: 0; }
      img { width: ${cell}px; height: auto; display: block; border-radius: 10px; outline: 1px solid ${dark ? '#3a2f29' : '#ddd3c2'}; }
      figcaption { margin-top: 6px; font-size: 12px; opacity: .8; word-break: break-word; }
    </style><h1>${brand.name}: ${v.replace('-', ', ')} (${files.length} screens)</h1><div class="grid">${files
      .map((f) => `<figure><img src="${pathToFileURL(join(dir, f)).href}"><figcaption>${f.replace('.png', '')}</figcaption></figure>`)
      .join('')}</div>`;
    const page = join(shots, `.sheet-${v}.html`);
    writeFileSync(page, html);
    const tab = await browser.newPage({ viewport: { width: desktop ? 1640 : 1500, height: 800 } });
    await tab.goto(pathToFileURL(page).href);
    await tab.waitForLoadState('load');
    await tab.screenshot({ path: join(shots, `contact-sheet-${v}.png`), fullPage: true });
    await tab.close();
    rmSync(page);
    console.log(`docs/shots/contact-sheet-${v}.png: ${files.length} screens`);
  }
} finally {
  await browser.close();
}
