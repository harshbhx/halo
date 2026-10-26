/** Tiny hash router for the app at /app: #/, #/today, #/practice, #/enrol, #/whisper, #/person/<id>, #/settings, #/backup, #/privacy, #/welcome, #/try (Halo in 60 seconds), #/card?d= (a card a helper prepared) */
import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'today' }
  | { name: 'practice' }
  | { name: 'enrol' }
  | { name: 'whisper'; demo: boolean }
  | { name: 'try' }
  | { name: 'card'; data: string }
  | { name: 'person'; id: string }
  | { name: 'settings' }
  | { name: 'backup' }
  | { name: 'privacy' }
  | { name: 'welcome' }
  | { name: 'consent'; data: string };

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#/, '');
  const [path, query = ''] = clean.split('?');
  const parts = path.split('/').filter(Boolean);
  switch (parts[0]) {
    case 'today':
      return { name: 'today' };
    case 'practice':
      return { name: 'practice' };
    case 'enrol':
      return { name: 'enrol' };
    case 'try':
      return { name: 'try' };
    case 'card':
      return { name: 'card', data: new URLSearchParams(query).get('d') ?? '' };
    case 'whisper':
      return { name: 'whisper', demo: new URLSearchParams(query).get('demo') === '1' };
    case 'person':
      return parts[1] ? { name: 'person', id: decodeURIComponent(parts[1]) } : { name: 'home' };
    case 'settings':
      return { name: 'settings' };
    case 'backup':
      return { name: 'backup' };
    case 'privacy':
      return { name: 'privacy' };
    case 'welcome':
      return { name: 'welcome' };
    case 'consent':
      return { name: 'consent', data: new URLSearchParams(query).get('d') ?? '' };
    default:
      return { name: 'home' };
  }
}

export function navigate(path: string, replace = false): void {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (replace) {
    history.replaceState(null, '', target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

function snapshot(): string {
  return window.location.hash;
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, snapshot, snapshot);
  return parseHash(hash);
}
