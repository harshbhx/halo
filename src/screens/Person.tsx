import { Camera, Play, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar, BackButton, ConfirmSheet, toast } from '../components/ui';
import { addOrUpdatePerson, removePerson, usePeople } from '../lib/people';
import { navigate } from '../lib/router';
import { getSettings } from '../lib/settings';
import type { Cues, Person as PersonRecord } from '../lib/types';
import { speak, unlockAudio } from '../lib/voice';
import { makeWhisper } from '../lib/whisper';
import { PhotoStep, type Shot } from './Enrol';

const MAX_FINGERPRINTS = 8;

const CUE_FIELDS: Array<{ key: keyof Cues; label: string }> = [
  { key: 'clothes', label: 'Usual clothes' },
  { key: 'hair', label: 'Hair' },
  { key: 'glasses', label: 'Glasses or accessories' },
  { key: 'other', label: 'Voice or anything else' },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function Person({ id }: { id: string }) {
  const { loaded, people } = usePeople();
  const original = useMemo(() => people.find((p) => p.id === id), [people, id]);
  const [draft, setDraft] = useState<PersonRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingPhotos, setAddingPhotos] = useState(false);
  const [newShots, setNewShots] = useState<Shot[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (original) setDraft(original);
  }, [original]);

  useEffect(() => {
    if (loaded && !original) navigate('/', true);
  }, [loaded, original]);

  if (!draft || !original) return <main className="screen" aria-busy="true" />;

  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const set = (patch: Partial<PersonRecord>) => setDraft({ ...draft, ...patch });

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await addOrUpdatePerson({ ...draft, name: draft.name.trim() || original!.name, updatedAt: new Date().toISOString() });
      toast('Saved');
    } catch {
      toast("Couldn't save. Is storage blocked in this browser?");
    } finally {
      setSaving(false);
    }
  }

  async function savePhotos() {
    if (!draft || newShots.length === 0) return;
    const descriptors = [...draft.descriptors, ...newShots.map((s) => s.descriptor)].slice(-MAX_FINGERPRINTS);
    await addOrUpdatePerson({ ...original!, descriptors, updatedAt: new Date().toISOString() });
    toast(`${newShots.length} ${newShots.length === 1 ? 'photo' : 'photos'} added`);
    setNewShots([]);
    setAddingPhotos(false);
  }

  async function doDelete() {
    setConfirmDelete(false);
    await removePerson(original!.id);
    toast(`${original!.name} deleted from this phone`);
    navigate('/', true);
  }

  if (addingPhotos) {
    return (
      <main className="screen screen--flow" aria-labelledby="photos-title">
        <div className="flow-head">
          <BackButton to={`/person/${encodeURIComponent(id)}`} label="Cancel adding photos" />
          <span className="spacer" />
        </div>
        <div className="flow-body">
          <div>
            <h1 id="photos-title" className="title title--md" tabIndex={-1}>
              More photos of {original.name}
            </h1>
            <p className="lede">New angles or new glasses help Face Whisper keep recognising them.</p>
          </div>
          <PhotoStep name={original.name} shots={newShots} setShots={setNewShots} heading={false} />
          <div className="flow-foot">
            <button type="button" className="btn btn--primary btn--block btn--lg" disabled={newShots.length === 0} onClick={savePhotos}>
              Add {newShots.length || ''} {newShots.length === 1 ? 'photo' : 'photos'}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => {
                setNewShots([]);
                setAddingPhotos(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="screen" aria-labelledby="person-title">
      <div className="topline">
        <BackButton to="/" label="Back to people" />
      </div>

      <div className="person-head">
        <Avatar src={draft.thumb} name={draft.name} large />
        <h1 id="person-title" className="title title--md" tabIndex={-1}>
          {original.name}
        </h1>
        <div className="meta-line">
          {original.sample && <span className="chip chip--warn">Sample person, AI-generated face</span>}
          <span className="chip">Agreed {formatDate(original.consentAt)}</span>
          <span className="chip">
            {original.descriptors.length} face {original.descriptors.length === 1 ? 'fingerprint' : 'fingerprints'}
          </span>
        </div>
      </div>

      <div className="stack stack--lg">
        <label className="field">
          <span className="field__label">Name</span>
          <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} autoComplete="off" />
        </label>

        <div className="whisper-card">
          <label className="whisper-card__label" htmlFor="person-whisper">
            Whisper
          </label>
          <textarea
            id="person-whisper"
            className="whisper-card__text"
            rows={Math.max(2, Math.ceil(draft.whisper.length / 24))}
            value={draft.whisper}
            onChange={(e) => set({ whisper: e.target.value, whisperSource: 'edited' })}
          />
          <div className="whisper-card__foot">
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => set({ whisper: makeWhisper(draft.name, draft.note), whisperSource: 'rules' })}
            >
              Rewrite from note
            </button>
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => {
                unlockAudio();
                const s = getSettings();
                void speak(draft.whisper, { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chime: s.chime });
              }}
            >
              <Play size={18} aria-hidden="true" /> Hear it
            </button>
          </div>
        </div>

        <label className="field">
          <span className="field__label">Your note</span>
          <textarea className="textarea" value={draft.note} onChange={(e) => set({ note: e.target.value })} rows={3} />
        </label>

        <h2 className="section-label" style={{ margin: '8px 0 0' }}>
          How to spot them
        </h2>
        {CUE_FIELDS.map((f) => (
          <label className="field" key={f.key}>
            <span className="field__label">{f.label}</span>
            <input
              className="input"
              value={draft.cues[f.key] ?? ''}
              onChange={(e) => set({ cues: { ...draft.cues, [f.key]: e.target.value } })}
              maxLength={80}
              autoComplete="off"
            />
          </label>
        ))}

        {dirty && (
          <div className="sticky-save">
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}

        <h2 className="section-label" style={{ margin: '12px 0 0' }}>
          Photos
        </h2>
        <button type="button" className="btn btn--secondary btn--block" onClick={() => setAddingPhotos(true)}>
          <Camera size={20} aria-hidden="true" /> Add more photos
        </button>

        <button type="button" className="btn btn--danger-soft btn--block" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={20} aria-hidden="true" /> Delete {original.name}
        </button>
      </div>

      <ConfirmSheet
        open={confirmDelete}
        title={`Delete ${original.name}?`}
        confirmLabel={`Delete ${original.name}`}
        danger
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      >
        Their fingerprints, note and whisper are removed from this phone. Face Whisper will stop recognising them straight away.
      </ConfirmSheet>
    </main>
  );
}
