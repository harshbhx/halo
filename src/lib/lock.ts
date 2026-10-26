/**
 * The app lock. A passcode (only a salted PBKDF2 hash is kept, in settings) or
 * the phone's own screen lock through WebAuthn (a platform credential that
 * needs the user's fingerprint, face or PIN). It is a lock screen: it stops
 * someone who picks up your unlocked phone from opening Halo. It is not a
 * second layer of encryption; the vault is already encrypted with the
 * browser's key.
 */
import { useSyncExternalStore } from 'react';
import { getSettings, updateSettings, type LockSettings } from './settings';

const ITERATIONS = 150_000;

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

export const PASSCODE_MIN = 4;
export const PASSCODE_MAX = 12;

async function derive(code: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

export function validPasscode(code: string): boolean {
  return code.length >= PASSCODE_MIN && code.length <= PASSCODE_MAX;
}

/** Makes the stored form of a passcode: never the code itself. */
export async function hashPasscode(code: string, iterations = ITERATIONS): Promise<Pick<LockSettings, 'hash' | 'salt' | 'iterations'>> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { hash: b64(await derive(code, salt, iterations)), salt: b64(salt), iterations };
}

export async function checkPasscode(code: string, lock: Pick<LockSettings, 'hash' | 'salt' | 'iterations'>): Promise<boolean> {
  if (!lock.hash || !lock.salt || !lock.iterations) return false;
  const got = await derive(code, unb64(lock.salt), lock.iterations);
  const want = unb64(lock.hash);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i += 1) diff |= got[i] ^ want[i];
  return diff === 0;
}

/** Whether this browser can use the phone's own lock (a platform authenticator with user verification). */
export async function deviceLockAvailable(): Promise<boolean> {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

/** Creates a credential tied to this phone's lock. Nothing is sent anywhere: there is no server. */
export async function registerDeviceLock(): Promise<string> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Halo' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'halo', displayName: 'Halo on this phone' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error('No credential was made');
  return b64(new Uint8Array(credential.rawId));
}

export async function unlockWithDevice(credentialId: string): Promise<boolean> {
  try {
    const result = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: unb64(credentialId) as BufferSource }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return !!result;
  } catch {
    return false;
  }
}

/* ---------- Locked state ---------- */

let locked = getSettings().lock.kind !== 'none';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function isLocked(): boolean {
  return locked;
}
export function lockNow(): void {
  if (getSettings().lock.kind === 'none') return;
  locked = true;
  emit();
}
export function unlock(): void {
  locked = false;
  lastActive = Date.now();
  emit();
}
export function useLocked(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    isLocked,
    isLocked,
  );
}

export async function turnOffLock(): Promise<void> {
  updateSettings({ lock: { kind: 'none', autoLockMinutes: getSettings().lock.autoLockMinutes } });
  locked = false;
  emit();
}

/* ---------- Auto-lock ---------- */

let lastActive = Date.now();
let hiddenAt = 0;

/**
 * Locks after the chosen minutes without a touch, or after that long away from
 * Halo. Not while `busy()` says Whisper mode is running: pocket mode is meant to
 * go untouched; leaving it, or hiding the page, still counts.
 */
export function startAutoLock(busy: () => boolean): () => void {
  const touch = () => (lastActive = Date.now());
  const minutes = () => getSettings().lock.autoLockMinutes;
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (hiddenAt && minutes() > 0 && Date.now() - hiddenAt >= minutes() * 60_000) lockNow();
  };
  const timer = setInterval(() => {
    if (locked || minutes() === 0 || busy()) return touch();
    if (Date.now() - lastActive >= minutes() * 60_000) lockNow();
  }, 5_000);
  for (const e of ['pointerdown', 'keydown', 'scroll'] as const) window.addEventListener(e, touch, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    clearInterval(timer);
    for (const e of ['pointerdown', 'keydown', 'scroll'] as const) window.removeEventListener(e, touch);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
