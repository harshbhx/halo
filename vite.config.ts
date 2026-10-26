/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
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
      const skip = (f: string) => f === 'sw.js' || f === 'precache.json' || f.endsWith('.md') || f.endsWith('.woff');
      const list = files.filter((f) => !skip(f)).sort();
      const hash = createHash('sha256');
      for (const f of list) hash.update(f).update(readFileSync(join(outDir, f)));
      writeFileSync(join(outDir, 'precache.json'), JSON.stringify({ version: hash.digest('hex').slice(0, 12), files: list }, null, 1));
    },
  };
}

export default defineConfig({
  plugins: [react(), precacheList()],
  // Relative asset paths so the built app works from any folder or sub-path.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
  },
  server: { host: true },
  preview: { host: true, port: 4173, strictPort: true },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
