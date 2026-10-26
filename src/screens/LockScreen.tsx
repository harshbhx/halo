import { Fingerprint, LockKeyhole } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { HaloMark } from '../components/ui';
import { BRAND } from '../brand';
import { checkPasscode, PASSCODE_MAX, unlock, unlockWithDevice } from '../lib/lock';
import { wipeEverything } from '../lib/wipe';
import { useSettings } from '../lib/settings';

/** Shown instead of the app while it is locked. Nothing behind it is rendered, so the camera is off. */
export function LockScreen() {
  const settings = useSettings();
  const lock = settings.lock;
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [armWipe, setArmWipe] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => heading.current?.focus(), []);
  useEffect(() => {
    if (!waitUntil) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [waitUntil]);
  useEffect(() => {
    if (!armWipe) return;
    const t = setTimeout(() => setArmWipe(false), 5000);
    return () => clearTimeout(t);
  }, [armWipe]);

  const waiting = waitUntil > now;

  async function tryCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy || waiting || !code) return;
    setBusy(true);
    const ok = await checkPasscode(code, lock);
    setBusy(false);
    if (ok) {
      unlock();
      return;
    }
    const n = wrong + 1;
    setWrong(n);
    setCode('');
    // After five wrong tries, wait a little longer each time.
    if (n >= 5) {
      setWaitUntil(Date.now() + Math.min(300, 30 * (n - 4)) * 1000);
      setNow(Date.now());
    }
    setError(n >= 5 ? 'That’s not it. Wait a moment before trying again.' : 'That’s not it. Try again.');
    input.current?.focus();
  }

  async function tryDevice() {
    if (!lock.credentialId) return;
    setBusy(true);
    setError('');
    const ok = await unlockWithDevice(lock.credentialId);
    setBusy(false);
    if (ok) unlock();
    else setError('Your phone didn’t confirm it was you. Try again.');
  }

  return (
    <main className="lock" aria-labelledby="lock-title">
      <div className="lock__body">
        <span className="wordmark">
          <HaloMark /> {BRAND.name}
        </span>
        <h1 id="lock-title" tabIndex={-1} ref={heading}>
          {BRAND.name} is locked
        </h1>
        {lock.kind === 'passcode' ? (
          <form className="stack" onSubmit={tryCode}>
            <label className="field">
              <span className="field__label">Passcode</span>
              <input
                ref={input}
                className="input lock__input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={PASSCODE_MAX}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                aria-describedby="lock-error"
                disabled={waiting}
              />
            </label>
            <button type="submit" className="btn btn--primary btn--block" disabled={busy || waiting || !code} aria-busy={busy}>
              <LockKeyhole size={20} aria-hidden="true" />
              {waiting ? `Try again in ${Math.ceil((waitUntil - now) / 1000)}s` : `Open ${BRAND.name}`}
            </button>
          </form>
        ) : (
          <button type="button" className="btn btn--primary btn--block" onClick={tryDevice} disabled={busy} aria-busy={busy}>
            <Fingerprint size={20} aria-hidden="true" /> Open with this phone’s lock
          </button>
        )}
        <p className="notice lock__error" id="lock-error" role="alert" hidden={!error}>
          {error}
        </p>
        <div className="lock__forgot">
          <p className="label">Forgot it? There is no way to recover it: nobody else holds your data. You can wipe {BRAND.name} and start again.</p>
          <button type="button" className="btn btn--quiet btn--danger-text" onClick={() => (armWipe ? void wipeEverything() : setArmWipe(true))}>
            {armWipe ? 'Tap again to wipe everything' : `Wipe ${BRAND.name} and start again`}
          </button>
        </div>
      </div>
    </main>
  );
}
