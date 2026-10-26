// Serves dist/ the way Cloudflare's static assets will: the headers from dist/_headers
// (including the strict Content-Security-Policy), trailing-slash folders, and a
// single-page-application fallback. Used by ./run.sh and the end-to-end tests.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wasm': 'application/wasm', '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};

/** Parse Cloudflare's _headers format: a path pattern line, then indented "Name: value" lines. */
function readHeaderRules() {
  const file = join(root, '_headers');
  if (!existsSync(file)) return [];
  const rules = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) rules.push({ pattern: line.trim(), headers: [] });
    else if (rules.length) {
      const i = line.indexOf(':');
      rules[rules.length - 1].headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules.map((r) => ({ ...r, re: new RegExp('^' + r.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$') }));
}
const rules = readHeaderRules();

function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, clean);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (existsSync(file) && statSync(file).isFile()) return file;
  return null;
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = resolveFile(url.pathname);
  // A folder without its trailing slash redirects, as Cloudflare's auto-trailing-slash does.
  if (file && file.endsWith('index.html') && !url.pathname.endsWith('/') && !url.pathname.endsWith('.html')) {
    res.writeHead(307, { Location: url.pathname + '/' + url.search });
    return res.end();
  }
  let status = 200;
  if (!file) {
    // Single-page-application fallback for navigations; real 404 for missing assets.
    const wantsPage = (req.headers.accept || '').includes('text/html');
    if (wantsPage) file = join(root, 'index.html');
    else status = 404;
  }
  for (const rule of rules) if (rule.re.test(url.pathname)) for (const [k, v] of rule.headers) res.setHeader(k, v);
  if (status === 404) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  res.writeHead(status, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`Halo is being served from dist/ at http://localhost:${port}/ (app at /app/)`));
