/**
 * Gentle camera hints: too dark, too far, or turned away. Pure functions so
 * they can be tested; the camera code feeds them numbers from each frame.
 */

export type Hint = 'dark' | 'far' | 'side' | 'none-in-view';

export interface FaceGeometry {
  /** Face box width as a share of the frame width, 0..1. */
  widthShare: number;
  /** Head turn: 0 facing the camera, about 0.5 or more turned well away. */
  yaw: number;
}

export const HINT_TEXT: Record<Hint, string> = {
  dark: 'It’s dark here. A little more light helps.',
  far: 'They’re a bit far away. Step a little closer.',
  side: 'Their face is turned away. Wait until they face you.',
  'none-in-view': 'No faces in view yet.',
};

/** Average brightness (0..255) of RGBA pixels, sampling every few pixels. */
export function brightness(data: Uint8ClampedArray, step = 4): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4 * step) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    n += 1;
  }
  return n ? sum / n : 0;
}

/** How far the nose sits from the middle of the eyes, relative to the eye distance. */
export function yawFrom(nose: { x: number }, leftEye: { x: number }, rightEye: { x: number }): number {
  const mid = (leftEye.x + rightEye.x) / 2;
  const span = Math.abs(rightEye.x - leftEye.x) || 1;
  return Math.abs(nose.x - mid) / span;
}

export const DARK_BELOW = 45;
export const FAR_BELOW = 0.09;
export const SIDE_ABOVE = 0.42;

/**
 * The one hint worth showing, or null. Only for faces we could not match:
 * a recognised face needs no advice.
 */
export function pickHint(input: { brightness: number; unmatched: FaceGeometry[]; anyFace: boolean }): Hint | null {
  if (input.brightness < DARK_BELOW) return 'dark';
  for (const face of input.unmatched) {
    if (face.yaw > SIDE_ABOVE) return 'side';
    if (face.widthShare < FAR_BELOW) return 'far';
  }
  return null;
}

/** Hints change slowly: a hint must hold for a few frames before it shows. */
export class HintSmoother {
  private last: Hint | null = null;
  private count = 0;
  constructor(private need = 4) {}
  push(hint: Hint | null): Hint | null {
    if (hint === this.last) this.count += 1;
    else {
      this.last = hint;
      this.count = 1;
    }
    return this.count >= this.need ? this.last : null;
  }
}
