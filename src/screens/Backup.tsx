import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { BackButton } from '../components/ui';
import { BACKUP_MESSAGES, BackupError, backupFileName, makeBackup, MIN_PASSPHRASE, parseBackup, readBackup, type BackupFile } from '../lib/backup';
import { restorePeople, usePeople } from '../lib/people';
import type { Person } from '../lib/types';
import { Avatar } from '../components/ui';
import { BRAND } from '../brand';

type Status = { tone: 'calm' | 'error'; text: string } | null;

/** Save the people on this phone to a file you keep, or bring them back from one. */
export function Backup() {
  const { people } = usePeople();
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [saveStatus, setSaveStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<BackupFile | null>(null);
  const [restorePass, setRestorePass] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<Status>(null);
  const [review, setReview] = useState<Person[] | null>(null);
  const [keep, setKeep] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const mismatch = pass2.length > 0 && pass !== pass2;
  const canSave = people.length > 0 && pass.length >= MIN_PASSPHRASE && pass === pass2 && !busy;

  async function save() {
    setBusy(true);
    setSaveStatus(null);
    try {
      const backup = await makeBackup(people, pass);
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setSaveStatus({ tone: 'calm', text: `Backup of ${people.length} ${people.length === 1 ? 'person' : 'people'} handed to your browser as ${a.download}. Keep the passphrase somewhere safe: without it the file can’t be opened.` });
      setPass('');
      setPass2('');
    } catch (err) {
      setSaveStatus({ tone: 'error', text: err instanceof BackupError ? BACKUP_MESSAGES[err.reason] : 'The backup couldn’t be made. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function choose(f: File | undefined) {
    setRestoreStatus(null);
    setFile(null);
    if (!f) return;
    try {
      setFile(parseBackup(await f.text()));
    } catch (err) {
      setRestoreStatus({ tone: 'error', text: err instanceof BackupError ? BACKUP_MESSAGES[err.reason] : BACKUP_MESSAGES['not-a-backup'] });
    }
  }

  /** Unlocking only shows who is inside; nobody is added until you choose them. */
  async function unlock() {
    if (!file) return;
    setBusy(true);
    setRestoreStatus(null);
    try {
      const found = await readBackup(file, restorePass);
      const fresh = found.filter((p) => !people.some((q) => q.id === p.id));
      setReview(fresh);
      setKeep(fresh.map((p) => p.id));
      setRestorePass('');
      if (fresh.length === 0) setRestoreStatus({ tone: 'calm', text: 'Everyone in that backup is already on this phone.' });
    } catch (err) {
      setRestoreStatus({ tone: 'error', text: err instanceof BackupError ? BACKUP_MESSAGES[err.reason] : 'That backup couldn’t be opened.' });
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!review) return;
    setBusy(true);
    try {
      const added = await restorePeople(review.filter((p) => keep.includes(p.id)));
      setRestoreStatus({ tone: 'calm', text: `Added ${added} ${added === 1 ? 'person' : 'people'}. They’re in your people list now.` });
      setReview(null);
      setFile(null);
    } catch (err) {
      setRestoreStatus({ tone: 'error', text: err instanceof BackupError ? BACKUP_MESSAGES[err.reason] : 'That backup couldn’t be restored.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen" aria-labelledby="backup-title">
      <div className="topbar">
        <BackButton to="/settings" label="Back to settings" />
      </div>
      <div className="page-head">
        <h1 id="backup-title" tabIndex={-1}>
          Back up or restore
        </h1>
        <p className="lead">A file you keep yourself, locked with a passphrase. Nothing is uploaded, ever.</p>
      </div>

      <section className="stack--lg" aria-labelledby="save-title">
        <h2 id="save-title">Save a backup</h2>
        <form
          className="stack--lg"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) void save();
          }}
        >
          <label className="field">
            <span className="field__label">Passphrase</span>
            <input className="input" type="password" name="new-password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            <span className="field__hint">At least {MIN_PASSPHRASE} characters. {BRAND.name} can’t recover it for you.</span>
          </label>
          <label className="field">
            <span className="field__label">Passphrase again</span>
            <input
              className="input"
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              value={pass2}
              aria-invalid={mismatch}
              aria-describedby="pass2-hint"
              onChange={(e) => setPass2(e.target.value)}
            />
            <span className="field__hint" id="pass2-hint">
              {mismatch ? 'The two passphrases don’t match yet.' : ''}
            </span>
          </label>
          <button type="submit" className="btn btn--primary btn--block" disabled={!canSave} aria-busy={busy}>
            <Download size={18} aria-hidden="true" />
            {people.length === 0 ? 'No one to back up yet' : `Save backup of ${people.length} ${people.length === 1 ? 'person' : 'people'}`}
          </button>
          {saveStatus && (
            <p className={`notice${saveStatus.tone === 'calm' ? ' notice--calm' : ''}`} role={saveStatus.tone === 'error' ? 'alert' : 'status'}>
              {saveStatus.text}
            </p>
          )}
        </form>
      </section>

      <section className="section stack--lg" aria-labelledby="restore-title">
        <h2 id="restore-title">Restore from a backup</h2>
        <input ref={fileInput} type="file" accept=".json,.fwbackup,application/json" className="visually-hidden" aria-label="Backup file" onChange={(e) => void choose(e.target.files?.[0])} />
        <button type="button" className="btn btn--block" onClick={() => fileInput.current?.click()}>
          <Upload size={18} aria-hidden="true" />
          {file ? `Chosen: a backup of ${file.people} ${file.people === 1 ? 'person' : 'people'}` : 'Choose a backup file'}
        </button>
        {file && !review && (
          <form
            className="stack--lg"
            onSubmit={(e) => {
              e.preventDefault();
              void unlock();
            }}
          >
            <label className="field">
              <span className="field__label">Its passphrase</span>
              <input className="input" type="password" name="password" autoComplete="current-password" value={restorePass} onChange={(e) => setRestorePass(e.target.value)} />
            </label>
            <button type="submit" className="btn btn--block" disabled={!restorePass || busy} aria-busy={busy}>
              Open the backup
            </button>
          </form>
        )}
        {review && review.length > 0 && (
          <form
            className="stack--lg"
            onSubmit={(e) => {
              e.preventDefault();
              void restore();
            }}
          >
            <fieldset className="stack" style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="field__label">Who should come back?</legend>
              <p className="field__hint">They agreed when they were first added. If you’re not sure they still agree, leave them out.</p>
              {review.map((p) => (
                <label className="pick" key={p.id}>
                  <input type="checkbox" checked={keep.includes(p.id)} onChange={(e) => setKeep(e.target.checked ? [...keep, p.id] : keep.filter((id) => id !== p.id))} />
                  <Avatar src={p.thumb} name={p.name} />
                  <span className="person__body">
                    <span className="person__name">{p.name}</span>
                    <span className="person__line">{p.whisper}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <button type="submit" className="btn btn--block" disabled={keep.length === 0 || busy} aria-busy={busy}>
              {keep.length === 0 ? 'Choose who to add' : `Add ${keep.length} ${keep.length === 1 ? 'person' : 'people'}`}
            </button>
          </form>
        )}
        {restoreStatus && (
          <p className={`notice${restoreStatus.tone === 'calm' ? ' notice--calm' : ''}`} role={restoreStatus.tone === 'error' ? 'alert' : 'status'}>
            {restoreStatus.text}
          </p>
        )}
      </section>
    </main>
  );
}
