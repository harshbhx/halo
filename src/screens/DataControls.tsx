import { Download, ShieldAlert, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, BackButton, ConfirmSheet, toast } from '../components/ui';
import { BRAND } from '../brand';
import { useLedger } from '../lib/ledger';
import { removeEveryone, removePerson, usePeople } from '../lib/people';
import { useReports } from '../lib/reports';
import { navigate } from '../lib/router';
import { resetSettings, useSettings } from '../lib/settings';
import { usePractice, useToday } from '../lib/stores';
import type { Person } from '../lib/types';
import { wipeEverything } from '../lib/wipe';

interface Device {
  usage: number | null;
  cacheFiles: number;
  worker: boolean;
}

function size(bytes: number | null): string {
  if (bytes === null) return 'unknown';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Everything Halo keeps on this phone, in one place, with the controls to remove it. */
export function DataControls() {
  const { loaded, people } = usePeople();
  const { list } = useToday();
  const practice = usePractice();
  const ledger = useLedger();
  const { reports } = useReports();
  const settings = useSettings();
  const [device, setDevice] = useState<Device>({ usage: null, cacheFiles: 0, worker: false });
  const [removing, setRemoving] = useState<Person | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [armWipe, setArmWipe] = useState(false);

  useEffect(() => {
    (async () => {
      const usage = (await navigator.storage?.estimate?.().catch(() => null))?.usage ?? null;
      let cacheFiles = 0;
      try {
        for (const key of await caches.keys()) cacheFiles += (await (await caches.open(key)).keys()).length;
      } catch {
        // no Cache Storage
      }
      const worker = !!(await navigator.serviceWorker?.getRegistrations().catch(() => []))?.length;
      setDevice({ usage, cacheFiles, worker });
    })();
  }, [people.length]);

  useEffect(() => {
    if (!armWipe) return;
    const t = setTimeout(() => setArmWipe(false), 5000);
    return () => clearTimeout(t);
  }, [armWipe]);

  const real = people.filter((p) => !p.sample);
  const samples = people.length - real.length;
  const fingerprints = people.reduce((n, p) => n + p.descriptors.length, 0);
  const ledgerCount = ledger.entries.length;

  async function doRemove() {
    if (!removing) return;
    const p = removing;
    setRemoving(null);
    await removePerson(p.id);
    toast(`${p.name} was removed from this phone.`);
  }

  async function doDeleteAll() {
    setConfirmAll(false);
    await removeEveryone();
    resetSettings();
    navigate('/welcome', true);
  }

  return (
    <main className="screen" aria-labelledby="data-screen-title">
      <div className="topbar">
        <BackButton to="/settings" label="Back to settings" />
      </div>
      <div className="page-head">
        <h1 id="data-screen-title" tabIndex={-1}>
          Your data
        </h1>
        <p className="lead">Everything {BRAND.name} keeps, all of it on this phone. Nothing here is on a server.</p>
      </div>

      <section className="section" aria-labelledby="stored-title">
        <h2 id="stored-title">What’s on this phone</h2>
        <dl className="panel data-rows" aria-busy={!loaded}>
          <div>
            <dt>People</dt>
            <dd>
              {real.length} you added{samples ? `, and ${samples} sample ${samples === 1 ? 'person' : 'people'}` : ''}
            </dd>
          </div>
          <div>
            <dt>Face fingerprints</dt>
            <dd>{fingerprints}, 128 numbers each, encrypted. No photos.</dd>
          </div>
          <div>
            <dt>Small pictures</dt>
            <dd>{people.filter((p) => p.thumb).length}, 160 by 160 pixels, encrypted</dd>
          </div>
          <div>
            <dt>Today’s list</dt>
            <dd>{list ? `${list.ids.length} ${list.ids.length === 1 ? 'person' : 'people'}${list.only ? ', event mode on' : ''}` : 'None'}</dd>
          </div>
          <div>
            <dt>Practice</dt>
            <dd>
              {Object.keys(practice.cards).length} cards, {practice.days.length} days practised
            </dd>
          </div>
          <div>
            <dt>Sent off this phone</dt>
            <dd>{ledgerCount === 0 ? 'Nothing, ever' : `${ledgerCount} Enhanced mode requests, text only (see Privacy)`}</dd>
          </div>
          <div>
            <dt>Wrong-match reports</dt>
            <dd>{reports.length}</dd>
          </div>
          <div>
            <dt>Settings</dt>
            <dd>
              In this browser’s storage. Lock: {settings.lock.kind === 'none' ? 'off' : settings.lock.kind === 'passcode' ? 'passcode (only a hash is kept)' : 'this phone’s lock'}
            </dd>
          </div>
          <div>
            <dt>Offline copy of the app</dt>
            <dd>
              {device.cacheFiles} files{device.worker ? ', service worker on' : ''}. No personal data.
            </dd>
          </div>
          <div>
            <dt>Space used by {BRAND.name}</dt>
            <dd>{size(device.usage)}</dd>
          </div>
        </dl>
      </section>

      {people.length > 0 && (
        <section className="section" aria-labelledby="people-data-title">
          <h2 id="people-data-title">Remove one person</h2>
          <ul className="people">
            {people.map((p) => (
              <li className="person" key={p.id}>
                <Avatar src={p.thumb} name={p.name} />
                <span className="person__body">
                  <span className="person__name">{p.name}</span>
                  <span className="person__line">
                    {p.descriptors.length} fingerprints{p.sample ? ', sample' : ''}
                  </span>
                </span>
                <button type="button" className="icon-btn" onClick={() => setRemoving(p)} aria-label={`Remove ${p.name}`}>
                  <Trash2 size={20} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section" aria-labelledby="keep-title">
        <h2 id="keep-title">Keep a copy, or remove it all</h2>
        <div className="panel">
          <div className="panel__row">
            <button type="button" className="btn btn--block" onClick={() => navigate('/backup')}>
              <Download size={18} aria-hidden="true" /> Export an encrypted backup
            </button>
          </div>
          <div className="panel__row">
            <button type="button" className="btn btn--block btn--danger" onClick={() => setConfirmAll(true)}>
              <Trash2 size={18} aria-hidden="true" /> Delete everything
            </button>
          </div>
        </div>
      </section>

      <section className="section wipe" aria-labelledby="wipe-title">
        <h2 id="wipe-title">Wipe now</h2>
        <p className="muted">
          For when you need it gone at once: the encrypted store and its key, the offline copy, the service worker and your settings, in one go. Two
          taps, no questions.
        </p>
        <button type="button" className="btn btn--block btn--wipe" onClick={() => (armWipe ? void wipeEverything() : setArmWipe(true))} aria-live="polite">
          <ShieldAlert size={20} aria-hidden="true" /> {armWipe ? 'Tap again to wipe everything now' : 'Wipe now'}
        </button>
      </section>

      <ConfirmSheet
        open={!!removing}
        title={`Remove ${removing?.name ?? ''}?`}
        confirmLabel={`Remove ${removing?.name ?? ''}`}
        danger
        onConfirm={doRemove}
        onCancel={() => setRemoving(null)}
      >
        Their fingerprints, note, picture and line are deleted from this phone.
      </ConfirmSheet>
      <ConfirmSheet open={confirmAll} title="Delete everything?" confirmLabel="Yes, delete everything" danger onConfirm={doDeleteAll} onCancel={() => setConfirmAll(false)}>
        Every person, note, fingerprint, practice record and setting, and the encryption key. This can’t be undone.
      </ConfirmSheet>
    </main>
  );
}

export function Wiped() {
  return (
    <main className="screen" aria-labelledby="wiped-title">
      <div className="page-head">
        <h1 id="wiped-title" tabIndex={-1}>
          {BRAND.name} is wiped from this browser
        </h1>
        <p className="lead">The encrypted store and its key, the offline copy, the service worker and your settings are gone. Nothing of your people is left here.</p>
      </div>
      <button type="button" className="btn btn--block" onClick={() => location.replace(location.pathname)}>
        Start again
      </button>
    </main>
  );
}
