/**
 * The privacy page must match the code. This fails if the Content Security
 * Policy, the network calls in the app, or the Enhanced mode routes drift from
 * what privacy/index.html tells people.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(root, dir))) {
    const rel = join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) files(rel, out);
    else if (/\.(ts|tsx|js|mjs|html)$/.test(name)) out.push(rel);
  }
  return out;
}

/** Everything that ships to the browser. */
const shipped = [...files('src'), ...files('landing'), ...files('consent'), ...files('helper'), 'public/sw.js', 'public/prefs.js'];
const privacy = read('privacy/index.html');

describe('privacy page against the code', () => {
  it('connections are limited to the same address, as the page says', () => {
    const csp = /Content-Security-Policy:([^\n]+)/.exec(read('public/_headers'))?.[1] ?? '';
    const connect = /connect-src ([^;]+)/.exec(csp)?.[1].trim();
    expect(connect).toBe("'self'");
    expect(privacy).toContain("connect-src 'self'");
  });

  it('only Enhanced mode makes network calls from the app code', () => {
    const callers = shipped.filter((f) => /\bfetch\s*\(/.test(read(f))).sort();
    // The service worker fetches the app's own files to cache them; Enhanced mode is the only other caller.
    expect(callers).toEqual(['public/sw.js', 'src/lib/enhanced.ts']);
    for (const f of shipped) {
      const src = read(f);
      expect(src, `${f} must not open other channels`).not.toMatch(/XMLHttpRequest|sendBeacon|new WebSocket|new EventSource|navigator\.share\(\s*\{[^}]*files/);
      expect(src, `${f} must not load code from elsewhere`).not.toMatch(/import\(\s*['"`]https?:/);
    }
  });

  it('the Enhanced mode routes the app calls are exactly the ones the page lists', () => {
    const called = [...read('src/lib/enhanced.ts').matchAll(/['"`](\/api\/[a-z]+)['"`]/g)].map((m) => m[1]);
    const listed = [...privacy.matchAll(/data-route="(\/api\/[a-z]+)"/g)].map((m) => m[1]);
    expect([...new Set(called)].sort()).toEqual([...new Set(listed)].sort());
  });

  it('the service worker only touches its own origin', () => {
    expect(read('public/sw.js')).toContain('if (url.origin !== self.location.origin) return;');
  });

  it('the stated limits match what the Worker enforces', () => {
    const worker = read('worker/index.ts');
    for (const rule of ['voiceChars: 200', 'translateChars: 300', 'nameChars: 60', 'noteChars: 500']) expect(worker).toContain(rule);
    expect(privacy).toMatch(/up to 200 characters/);
    expect(privacy).toMatch(/up to 300 characters/);
    expect(privacy).toMatch(/up to 60 and 500 characters/);
  });
});
