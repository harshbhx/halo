/**
 * Backups you keep yourself: the people on this phone, encrypted with a
 * passphrase you choose, saved as a file. Nothing is uploaded; moving the file
 * to a new phone and restoring it is up to you.
 *
 * The vault's own key can never leave the browser, so the backup has its own:
 * PBKDF2 (SHA-256) turns the passphrase into an AES-GCM key.
 */
import { BRAND } from '../brand';
import type { Person } from './types';

export const BACKUP_FORMAT = 'face-whisper-backup';
export const BACKUP_ITERATIONS = 250_000;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: 1;
  created: string;
  people: number;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  iv: string;
  data: string;
}

export class BackupError extends Error {
  constructor(public reason: 'not-a-backup' | 'wrong-passphrase' | 'short-passphrase') {
    super(reason);
  }
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export const MIN_PASSPHRASE = 8;

export async function makeBackup(people: Person[], passphrase: string, now = new Date()): Promise<BackupFile> {
  if (passphrase.length < MIN_PASSPHRASE) throw new BackupError('short-passphrase');
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const key = await deriveKey(passphrase, salt, BACKUP_ITERATIONS);
  const plain = new TextEncoder().encode(JSON.stringify({ people }));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  return {
    format: BACKUP_FORMAT,
    version: 1,
    created: now.toISOString(),
    people: people.length,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: BACKUP_ITERATIONS, salt: toBase64(salt) },
    iv: toBase64(iv),
    data: toBase64(data),
  };
}

export function parseBackup(text: string): BackupFile {
  let file: Partial<BackupFile>;
  try {
    file = JSON.parse(text) as Partial<BackupFile>;
  } catch {
    throw new BackupError('not-a-backup');
  }
  if (file.format !== BACKUP_FORMAT || file.version !== 1 || !file.kdf || !file.iv || !file.data) {
    throw new BackupError('not-a-backup');
  }
  return file as BackupFile;
}

export async function readBackup(file: BackupFile, passphrase: string): Promise<Person[]> {
  const key = await deriveKey(passphrase, fromBase64(file.kdf.salt), file.kdf.iterations);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(file.iv) }, key, fromBase64(file.data));
  } catch {
    throw new BackupError('wrong-passphrase');
  }
  const parsed = JSON.parse(new TextDecoder().decode(plain)) as { people?: Person[] };
  if (!Array.isArray(parsed.people)) throw new BackupError('not-a-backup');
  return parsed.people.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.descriptors));
}

export function backupFileName(now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `${BRAND.slug}-backup-${d}.json`;
}

export const BACKUP_MESSAGES: Record<BackupError['reason'], string> = {
  'not-a-backup': `That file isn\u2019t a ${BRAND.name} backup. Choose the backup file you saved.`,
  'wrong-passphrase': "That passphrase doesn't open this backup. Check it and try again.",
  'short-passphrase': `Use a passphrase of at least ${MIN_PASSPHRASE} characters.`,
};
