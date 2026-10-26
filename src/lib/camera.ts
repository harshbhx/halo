/** Camera access. The stream is only ever drawn and analysed on this device. */

export type CameraProblem = 'blocked' | 'missing' | 'insecure' | 'busy' | 'unknown';

export class CameraError extends Error {
  constructor(public problem: CameraProblem) {
    super(problem);
  }
}

export async function openCamera(facing: 'user' | 'environment'): Promise<MediaStream> {
  if (!window.isSecureContext) throw new CameraError('insecure');
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('missing');
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new CameraError('blocked');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new CameraError('missing');
    if (name === 'NotReadableError' || name === 'AbortError') throw new CameraError('busy');
    throw new CameraError('unknown');
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}

export const CAMERA_MESSAGES: Record<CameraProblem, { title: string; body: string }> = {
  blocked: {
    title: 'Camera is blocked',
    body: 'Allow camera access for this site in your browser settings (tap the lock or "aA" icon next to the address), then try again.',
  },
  missing: { title: 'No camera found', body: 'This device has no camera we can use. You can still try the demo camera.' },
  insecure: {
    title: 'Camera needs a secure page',
    body: 'Browsers only allow the camera on https or localhost. Open Face Whisper from a secure address.',
  },
  busy: { title: 'Camera is busy', body: 'Another app may be using the camera. Close it and try again.' },
  unknown: { title: "Camera didn't start", body: 'Something stopped the camera from starting. Try again.' },
};
