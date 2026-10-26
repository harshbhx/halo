// Copies what the on-device face engine needs into public/ so it is served from
// the app's own origin (no CDN, nothing fetched elsewhere):
//   public/models/  face-api model weights (detector, tiny landmarks, recogniser)
//   public/wasm/    TensorFlow.js WebAssembly binaries, the fallback when WebGL is unavailable
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function copy(fromDir, toDir, keep, label) {
  if (!existsSync(fromDir)) {
    console.warn(`[copy-models] ${label}: ${fromDir} not installed yet, skipping`);
    return;
  }
  mkdirSync(toDir, { recursive: true });
  let n = 0;
  for (const file of readdirSync(fromDir)) {
    if (keep(file)) {
      cpSync(join(fromDir, file), join(toDir, file));
      n += 1;
    }
  }
  console.log(`[copy-models] ${label}: ${n} files ready in ${toDir.replace(root + '/', '')}`);
}

const models = ['tiny_face_detector_model', 'face_landmark_68_tiny_model', 'face_recognition_model'];
copy(
  join(root, 'node_modules', '@vladmandic', 'face-api', 'model'),
  join(root, 'public', 'models'),
  (f) => models.some((m) => f.startsWith(m)),
  'face models',
);
copy(
  join(root, 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist'),
  join(root, 'public', 'wasm'),
  (f) => f.endsWith('.wasm'),
  'tfjs wasm',
);
