// Build-time check: the built site must not load anything from another origin.
// It reads every HTML, CSS and manifest file in dist/ and fails on any external
// script, stylesheet, font, image, media, manifest or CSS url(). Plain links to
// other sites (<a href>) are navigation, not requests, and are allowed.
// The end-to-end test "makes no external requests" checks the running app as well.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const external = /^(https?:)?\/\//i;
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else check(full);
  }
}

function check(file) {
  const rel = relative(dist, file);
  if (file.endsWith('.html')) {
    const html = readFileSync(file, 'utf8');
    const tags = html.match(/<(script|link|img|source|video|audio|iframe|embed|object)\b[^>]*>/gi) || [];
    for (const tag of tags) {
      const attrs = [...tag.matchAll(/\b(src|href|srcset|poster|data)\s*=\s*"([^"]*)"/gi)];
      for (const [, attr, value] of attrs) {
        for (const part of value.split(',')) if (external.test(part.trim())) problems.push(`${rel}: <${tag.slice(1, tag.indexOf(' '))} ${attr}="${value}">`);
      }
    }
    for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)/gi)) if (external.test(m[1])) problems.push(`${rel}: inline url(${m[1]})`);
  } else if (file.endsWith('.css')) {
    const css = readFileSync(file, 'utf8');
    for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)/gi)) if (external.test(m[1])) problems.push(`${rel}: url(${m[1]})`);
    for (const m of css.matchAll(/@import\s+(?:url\()?['"]?([^'");]+)/gi)) if (external.test(m[1])) problems.push(`${rel}: @import ${m[1]}`);
  } else if (file.endsWith('.webmanifest')) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/"(?:src|start_url|scope)"\s*:\s*"([^"]+)"/g)) if (external.test(m[1])) problems.push(`${rel}: ${m[1]}`);
  }
}

walk(dist);
if (problems.length) {
  console.error(`check-no-external: ${problems.length} external request(s) in the build:\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log('check-no-external: the build loads nothing from another origin');
