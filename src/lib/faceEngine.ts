/**
 * The face reader. Runs face-api (TensorFlow.js) inside the browser:
 * TinyFaceDetector finds faces, a tiny 68-point landmark model aligns them,
 * and FaceRecognitionNet turns each face into a 128-number fingerprint.
 *
 * Model files are served from this app's own /models folder. No frame, face or
 * fingerprint ever leaves the device.
 */
type FaceApi = typeof import('@vladmandic/face-api');

export interface DetectedFace {
  box: { x: number; y: number; width: number; height: number };
  score: number;
  descriptor: Float32Array;
  /** Nose tip and eye centres, for the "turned away" hint. */
  marks: { nose: Point; leftEye: Point; rightEye: Point };
}

interface Point {
  x: number;
  y: number;
}

function centre(points: Point[]): Point {
  const x = points.reduce((s, p) => s + p.x, 0) / points.length;
  const y = points.reduce((s, p) => s + p.y, 0) / points.length;
  return { x, y };
}

export type DescribeResult =
  | { ok: true; descriptor: number[]; thumb: string; box: DetectedFace['box'] }
  | { ok: false; reason: 'no-face' | 'many-faces' | 'too-small' | 'unclear' };

let api: FaceApi | null = null;
let loading: Promise<FaceApi> | null = null;
let backendName = 'unknown';

export function engineBackend(): string {
  return backendName;
}

export function engineReady(): boolean {
  return api !== null;
}

/** Loads TensorFlow.js and the three models once. Safe to call repeatedly. */
export function loadEngine(onProgress?: (fraction: number) => void): Promise<FaceApi> {
  if (api) return Promise.resolve(api);
  loading ??= (async () => {
    onProgress?.(0.05);
    const faceapi = await import('@vladmandic/face-api');
    onProgress?.(0.25);
    const tf = faceapi.tf as unknown as {
      setBackend(name: string): Promise<boolean>;
      ready(): Promise<void>;
      getBackend(): string;
      setWasmPaths?(prefix: string): void;
    };
    // Fastest first: the GPU (WebGL), then WebAssembly, then plain JavaScript.
    tf.setWasmPaths?.(new URL('../wasm/', document.baseURI).href);
    for (const backend of ['webgl', 'wasm', 'cpu']) {
      try {
        if ((await tf.setBackend(backend)) && tf.getBackend() === backend) {
          await tf.ready();
          break;
        }
      } catch {
        // try the next one
      }
    }
    backendName = tf.getBackend();
    onProgress?.(0.4);

    const base = new URL('../models/', document.baseURI).href;
    let done = 0;
    const step = () => {
      done += 1;
      onProgress?.(0.4 + (done / 3) * 0.5);
    };
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(base).then(step),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(base).then(step),
      faceapi.nets.faceRecognitionNet.loadFromUri(base).then(step),
    ]);

    // Warm up once so the first real frame isn't slow (shader compilation).
    const warm = document.createElement('canvas');
    warm.width = 160;
    warm.height = 160;
    await faceapi
      .detectAllFaces(warm, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
      .withFaceLandmarks(true)
      .withFaceDescriptors();
    onProgress?.(1);
    api = faceapi;
    return faceapi;
  })();
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

type Input = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement;

/** Every face in a frame, with its fingerprint. Used by Whisper mode. */
export async function detectAll(input: Input, inputSize = 320): Promise<DetectedFace[]> {
  const faceapi = await loadEngine();
  const results = await faceapi
    .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.5 }))
    .withFaceLandmarks(true)
    .withFaceDescriptors();
  return results.map((r) => {
    const pts = r.landmarks.positions;
    return {
      box: { x: r.detection.box.x, y: r.detection.box.y, width: r.detection.box.width, height: r.detection.box.height },
      score: r.detection.score,
      descriptor: r.descriptor,
      marks: { nose: pts[30], leftEye: centre(pts.slice(36, 42)), rightEye: centre(pts.slice(42, 48)) },
    };
  });
}

function sourceSize(input: Input): { width: number; height: number } {
  if (input instanceof HTMLVideoElement) return { width: input.videoWidth, height: input.videoHeight };
  if (input instanceof HTMLImageElement) return { width: input.naturalWidth, height: input.naturalHeight };
  return { width: input.width, height: input.height };
}

/** A small square crop around the face for the people list. */
export function cropThumb(input: Input, box: DetectedFace['box'], size = 160): string {
  const { width, height } = sourceSize(input);
  const side = Math.min(Math.max(box.width, box.height) * 1.6, width, height);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const sx = Math.min(Math.max(cx - side / 2, 0), width - side);
  const sy = Math.min(Math.max(cy - side / 2, 0), height - side);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(input, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.82);
}

/**
 * Enrolment: the shot must contain exactly one clear face of usable size.
 * Returns its fingerprint and a thumbnail; the full photo is not kept.
 */
export async function describe(input: Input): Promise<DescribeResult> {
  const faces = await detectAll(input, 416);
  const { width } = sourceSize(input);
  const clear = faces.filter((f) => f.score >= 0.55);
  if (faces.length === 0) return { ok: false, reason: 'no-face' };
  if (clear.length > 1) return { ok: false, reason: 'many-faces' };
  const face = clear[0] ?? faces[0];
  if (face.score < 0.55) return { ok: false, reason: 'unclear' };
  if (face.box.width < width * 0.1) return { ok: false, reason: 'too-small' };
  return {
    ok: true,
    descriptor: Array.from(face.descriptor, (n) => Math.round(n * 1e6) / 1e6),
    thumb: cropThumb(input, face.box),
    box: face.box,
  };
}

/** Copies the current video frame onto a canvas (what the shutter "takes"). */
export function grabFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')?.drawImage(video, 0, 0);
  return canvas;
}

let sampler: CanvasRenderingContext2D | null = null;

/** Average brightness, 0 to 255, of the face region when given (else the whole frame). */
export function frameBrightness(input: Input, box?: { x: number; y: number; width: number; height: number }): number {
  if (!sampler) {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    sampler = c.getContext('2d', { willReadFrequently: true });
  }
  if (!sampler) return 128;
  if (box && box.width > 4 && box.height > 4) sampler.drawImage(input, box.x, box.y, box.width, box.height, 0, 0, 32, 32);
  else sampler.drawImage(input, 0, 0, 32, 32);
  const data = sampler.getImageData(0, 0, 32, 32).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  return sum / (data.length / 4);
}

export function sourceWidth(input: Input): number {
  return sourceSize(input).width;
}

export const DESCRIBE_MESSAGES: Record<Exclude<DescribeResult, { ok: true }>['reason'], string> = {
  'no-face': 'No face in that photo. More light, or a step closer, usually fixes it.',
  'many-faces': 'Two or more faces were in view. Frame only the person you\u2019re adding.',
  'too-small': 'Their face is a bit small in the frame. Step a little closer.',
  unclear: 'That photo was unclear. Hold the phone still and try again.',
};
