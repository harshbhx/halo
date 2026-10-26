/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
