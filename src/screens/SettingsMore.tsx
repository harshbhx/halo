/** Settings sections for the lock, wrong-match suggestions, battery and the documents. */
import { ChevronRight, Database, FileText, HelpCircle, LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BRAND } from '../brand';
import { ConfirmSheet, Segmented, Switch, toast } from '../components/ui';
import { deviceLockAvailable, hashPasscode, lockNow, PASSCODE_MAX, PASSCODE_MIN, registerDeviceLock, turnOffLock, validPasscode } from '../lib/lock';
import { addOrUpdatePerson, usePeople } from '../lib/people';
import { clearReports, suggest, useReports } from '../lib/reports';
import { navigate } from '../lib/router';
import { updateSettings, useSettings } from '../lib/settings';
import { LANGUAGES, useT, type Lang } from '../lib/i18n';

const AUTO_LOCK = [
  { value: 1, label: 'After 1 minute' },
  { value: 5, label: 'After 5 minutes' },
  { value: 15, label: 'After 15 minutes' },
  { value: 0, label: 'Only when I reopen it' },
];

export function LockSection() {
  const settings = useSettings();
  const lock = settings.lock;
  const [device, setDevice] = useState(false);
  const [setting, setSetting] = useState(false);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void deviceLockAvailable().then(setDevice);
  }, []);

  async function choose(kind: 'none' | 'passcode' | 'device') {
    if (kind === lock.kind) return;
    if (kind === 'none') return void turnOffLock();
    if (kind === 'passcode') return setSetting(true);
    try {
      const credentialId = await registerDeviceLock();
      updateSettings({ lock: { kind: 'device', credentialId, autoLockMinutes: lock.autoLockMinutes } });
      toast(`${BRAND.name} now opens with this phone’s lock.`);
    } catch {
      toast('Your phone didn’t set up its lock for Halo. Nothing changed.');
    }
  }

  async function savePasscode() {
    if (!validPasscode(first)) return setError(`Use ${PASSCODE_MIN} to ${PASSCODE_MAX} digits or characters.`);
    if (first !== second) return setError('The two don’t match.');
    const stored = await hashPasscode(first);
    updateSettings({ lock: { kind: 'passcode', ...stored, autoLockMinutes: lock.autoLockMinutes } });
    setSetting(false);
    setFirst('');
    setSecond('');
    setError('');
    toast('Passcode set. Only a salted hash of it is kept.');
  }

  return (
    <section className="section" aria-labelledby="lock-title">
      <h2 id="lock-title">Lock</h2>
      <div className="panel">
        <div className="panel__row panel__row--stack">
          <span className="panel__title">Open {BRAND.name} with</span>
          <Segmented<'none' | 'passcode' | 'device'>
            label={`Open ${BRAND.name} with`}
            value={lock.kind}
            options={[
              { value: 'none', label: 'Nothing' },
              { value: 'passcode', label: 'A passcode' },
              ...(device || lock.kind === 'device' ? [{ value: 'device' as const, label: 'Phone lock' }] : []),
            ]}
            onChange={(k) => void choose(k)}
          />
          <span className="panel__hint">
            Stops someone who picks up your unlocked phone from opening {BRAND.name}. It’s a lock screen, not extra encryption: your people are already
            encrypted with the browser’s key. Forget the passcode and the only way back is to wipe {BRAND.name}.
          </span>
        </div>
        {lock.kind !== 'none' && (
          <>
            <label className="panel__row panel__row--stack">
              <span className="panel__title">Lock again</span>
              <select className="select" value={lock.autoLockMinutes} onChange={(e) => updateSettings({ lock: { ...lock, autoLockMinutes: Number(e.target.value) } })}>
                {AUTO_LOCK.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="panel__hint">Idle time or time away. Whisper mode doesn’t lock while it’s open, so pocket mode keeps working.</span>
            </label>
            <div className="panel__row">
              <button type="button" className="btn btn--block" onClick={lockNow}>
                <LockKeyhole size={18} aria-hidden="true" /> Lock now
              </button>
            </div>
          </>
        )}
      </div>
      <ConfirmSheet open={setting} title="Set a passcode" confirmLabel="Set passcode" cancelLabel="Cancel" onConfirm={() => void savePasscode()} onCancel={() => (setSetting(false), setError(''))}>
        <span className="stack">
          <label className="field">
            <span className="field__label">Passcode</span>
            <input className="input" type="password" inputMode="numeric" autoComplete="new-password" maxLength={PASSCODE_MAX} value={first} onChange={(e) => setFirst(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Same again</span>
            <input className="input" type="password" inputMode="numeric" autoComplete="new-password" maxLength={PASSCODE_MAX} value={second} onChange={(e) => setSecond(e.target.value)} />
          </label>
          {error && (
            <span className="notice" role="alert">
              {error}
            </span>
          )}
        </span>
      </ConfirmSheet>
    </section>
  );
}

export function WrongMatchSection() {
  const settings = useSettings();
  const { reports } = useReports();
  const { people } = usePeople();
  if (reports.length === 0) return null;
  const tips = suggest(reports, settings.strictness, (id) => !!people.find((p) => p.id === id)?.hold);
  return (
    <section className="section" aria-labelledby="wrong-title">
      <h2 id="wrong-title">Wrong matches</h2>
      <div className="panel">
        <p className="panel__row panel__hint">
          You reported {reports.length} wrong {reports.length === 1 ? 'match' : 'matches'}. The reports stay on this phone.
        </p>
        {tips.map((tip) => (
          <div className="panel__row" key={tip.kind + ('personId' in tip ? tip.personId : '')}>
            <span className="panel__text">
              {tip.kind === 'careful' && (
                <>
                  <span className="panel__title">Switch to Careful</span>
                  <span className="panel__hint">
                    Careful would have stayed quiet for {tip.avoided} of {tip.total}.
                  </span>
                </>
              )}
              {tip.kind === 'hold' && (
                <>
                  <span className="panel__title">Hold {tip.name} at “Could be”</span>
                  <span className="panel__hint">Named wrongly {tip.count} times. Halo will only suggest them, never say it.</span>
                </>
              )}
              {tip.kind === 'photos' && (
                <>
                  <span className="panel__title">Add new photos of {tip.name}</span>
                  <span className="panel__hint">Looks change: a new haircut or glasses. More angles help.</span>
                </>
              )}
            </span>
            {tip.kind === 'careful' && (
              <button type="button" className="btn btn--small" onClick={() => updateSettings({ strictness: 'careful' })}>
                Switch
              </button>
            )}
            {tip.kind === 'hold' && (
              <button
                type="button"
                className="btn btn--small"
                onClick={() => {
                  const p = people.find((x) => x.id === tip.personId);
                  if (p) void addOrUpdatePerson({ ...p, hold: true, updatedAt: new Date().toISOString() });
                }}
              >
                Hold
              </button>
            )}
            {tip.kind === 'photos' && (
              <button type="button" className="btn btn--small" onClick={() => navigate(`/person/${encodeURIComponent(tip.personId)}`)}>
                Open
              </button>
            )}
          </div>
        ))}
        <div className="panel__row">
          <button type="button" className="btn btn--quiet" onClick={() => void clearReports()}>
            Clear the reports
          </button>
        </div>
      </div>
    </section>
  );
}

export function LanguageRow() {
  const settings = useSettings();
  const t = useT();
  return (
    <div className="panel__row panel__row--stack">
      <span className="panel__title">{t('settings.language')}</span>
      <Segmented<Lang>
        label={t('settings.language')}
        value={settings.language ?? 'en'}
        options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
        onChange={(language) => updateSettings({ language })}
      />
      <span className="panel__hint">{t('settings.language.hint')}</span>
    </div>
  );
}

export function BatteryRow() {
  const settings = useSettings();
  return (
    <div className="panel__row">
      <span className="panel__text">
        <span className="panel__title">Battery saver</span>
        <span className="panel__hint">Whisper mode reads about two frames a second instead of about six. A little slower to notice someone.</span>
      </span>
      <Switch checked={settings.batterySaver} onChange={(batterySaver) => updateSettings({ batterySaver })} label="Battery saver" />
    </div>
  );
}

export function DataLinkRow() {
  return (
    <button type="button" className="panel__row panel__link" onClick={() => navigate('/data')}>
      <Database size={22} aria-hidden="true" />
      <span className="panel__text">
        <span className="panel__title">Everything on this phone</span>
        <span className="panel__hint">See it all, remove one person, export, or wipe now.</span>
      </span>
      <ChevronRight size={20} aria-hidden="true" />
    </button>
  );
}

export function DocumentRows() {
  return (
    <>
      <button type="button" className="panel__row panel__link" onClick={() => navigate('/help')}>
        <HelpCircle size={22} aria-hidden="true" />
        <span className="panel__text">
          <span className="panel__title">Help and questions</span>
          <span className="panel__hint">The camera, the microphone, better matches.</span>
        </span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
      <div className="panel__row doc-links">
        <FileText size={22} aria-hidden="true" />
        <span className="panel__text">
          <span className="panel__title">The full documents</span>
          <span className="panel__hint">
            <a href="../privacy/">Privacy</a>, <a href="../terms/">Terms</a> and <a href="../safety/">Safety</a>, in plain words
          </span>
        </span>
      </div>
    </>
  );
}
