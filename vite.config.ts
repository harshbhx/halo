/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Writes dist/precache.json: every built file, so the service worker can make the app work offline. */
function precacheList(): Plugin {
  let outDir = 'dist';
  return {
    name: 'face-whisper-precache-list',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else files.push(relative(outDir, full).split('\\').join('/'));
        }
      };
      walk(outDir);
      const skip = (f: string) => f === 'sw.js' || f === 'precache.json' || f.startsWith('_') || f.endsWith('.md') || f.endsWith('.woff');
      const list = files.filter((f) => !skip(f)).sort();
      const hash = createHash('sha256');
      for (const f of list) hash.update(f).update(readFileSync(join(outDir, f)));
      writeFileSync(join(outDir, 'precache.json'), JSON.stringify({ version: hash.digest('hex').slice(0, 12), files: list }, null, 1));
    },
  };
}

const root = dirname(fileURLToPath(import.meta.url));
const brand = JSON.parse(readFileSync(resolve(root, 'brand.config.json'), 'utf8')) as Record<string, string>;

/** The name lives in brand.config.json: HTML tokens like %BRAND_NAME% and the web manifest come from it. */
function brandPlugin(): Plugin {
  const manifest = () =>
    JSON.stringify(
      {
        name: brand.name,
        short_name: brand.name,
        description: brand.description,
        start_url: './app/',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0f17',
        theme_color: '#0b0f17',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      null,
      2,
    );
  return {
    name: 'brand',
    transformIndexHtml(html) {
      return html
        .replaceAll('%BRAND_NAME%', brand.name)
        .replaceAll('%BRAND_TAGLINE%', brand.tagline)
        .replaceAll('%BRAND_DESCRIPTION%', brand.description)
        .replaceAll('%BRAND_URL%', brand.url);
    },
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.end(manifest());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest() });
    },
  };
}

export default defineConfig({
  plugins: [react(), brandPlugin(), precacheList()],
  // Relative asset paths so the built app works from any folder or sub-path.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      // The landing page at / and the app at /app/.
      input: { main: resolve(root, 'index.html'), app: resolve(root, 'app/index.html') },
    },
  },
  server: { host: true },
  preview: { host: true, port: 4173, strictPort: true },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
