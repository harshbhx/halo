import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/700.css';
import './styles/app.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Test hook: the accuracy script measures the real engine. Only present when a test sets __fwDebug.
if ((window as unknown as { __fwDebug?: boolean }).__fwDebug) {
  void import('./lib/faceEngine').then((engine) => {
    (window as unknown as { __fwEval?: unknown }).__fwEval = engine;
  });
}

// Offline support for the built app (never in development, where files change constantly).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(() => {
      // Offline support is a bonus; the app works without it.
    });
  });
}
