// Copies the face-api model weights the app uses into public/models so they are
// served from the same origin as the app (no CDN, nothing fetched elsewhere).
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@vladmandic', 'face-api', 'model');
const dest = join(root, 'public', 'models');
const wanted = ['tiny_face_detector_model', 'face_landmark_68_tiny_model', 'face_recognition_model'];

if (!existsSync(src)) {
  console.warn('[copy-models] face-api is not installed yet, skipping');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
let copied = 0;
for (const file of readdirSync(src)) {
  if (wanted.some((name) => file.startsWith(name))) {
    cpSync(join(src, file), join(dest, file));
    copied += 1;
  }
}
console.log(`[copy-models] ${copied} model files ready in public/models`);
