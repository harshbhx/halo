import { Camera, Play, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar, BackButton, ConfirmSheet, toast } from '../components/ui';
import { addOrUpdatePerson, removePerson, usePeople } from '../lib/people';
import { boxLabel } from '../lib/practice';
import { navigate } from '../lib/router';
import { getSettings } from '../lib/settings';
import { usePractice } from '../lib/stores';
import type { Cues, Person as PersonRecord } from '../lib/types';
import { speak, unlockAudio } from '../lib/voice';
import { makeWhisper } from '../lib/whisper';
import { spokenLine } from '../lib/whisperStyle';
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
  const practice = usePractice();
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

  function hear(text: string) {
    unlockAudio();
    const s = getSettings();
    void speak(text, { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chimeSound: 'off' });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await addOrUpdatePerson({ ...draft, name: draft.name.trim() || original!.name, updatedAt: new Date().toISOString() });
    } catch {
      toast('Nothing was saved: this browser is blocking storage.');
    } finally {
      setSaving(false);
    }
  }

  async function savePhotos() {
    if (newShots.length === 0) return;
    const descriptors = [...original!.descriptors, ...newShots.map((s) => s.descriptor)].slice(-MAX_FINGERPRINTS);
    await addOrUpdatePerson({ ...original!, descriptors, updatedAt: new Date().toISOString() });
    setNewShots([]);
    setAddingPhotos(false);
  }

  async function doDelete() {
    setConfirmDelete(false);
    await removePerson(original!.id);
    toast(`${original!.name} was removed from this phone.`);
    navigate('/', true);
  }

  if (addingPhotos) {
    return (
      <main className="screen screen--flow" aria-labelledby="photos-title">
        <div className="flow-head">
          <button type="button" className="icon-btn" onClick={() => setAddingPhotos(false)} aria-label="Cancel adding photos">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="flow-body">
          <div className="stack">
            <h1 id="photos-title" tabIndex={-1}>
              More photos of {original.name}
            </h1>
            <p className="lead">New angles, a new haircut or new glasses help your phone keep recognising them.</p>
          </div>
          <PhotoStep name={original.name} shots={newShots} setShots={setNewShots} heading={false} />
          <div className="flow-foot">
            <button type="button" className="btn btn--primary btn--block" disabled={newShots.length === 0} onClick={savePhotos}>
              {newShots.length === 0 ? 'Take a photo first' : `Add ${newShots.length} ${newShots.length === 1 ? 'photo' : 'photos'}`}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="screen" aria-labelledby="person-title">
      <div className="topbar">
        <BackButton to="/" label="Back to your people" />
        <button type="button" className="btn" onClick={() => hear(spokenLine(original, 'warm'))}>
          <Play size={18} aria-hidden="true" /> Remind me
        </button>
      </div>

      <div className="person-head">
        <Avatar src={draft.thumb} name={draft.name} large />
        <h1 id="person-title" tabIndex={-1}>
          {original.name}
        </h1>
        <div className="tags">
          {original.sample ? <span className="tag tag--sample">Sample person, AI-generated face</span> : <span className="tag">Agreed {formatDate(original.consentAt)}</span>}
          <span className="tag">
            {original.descriptors.length} face {original.descriptors.length === 1 ? 'fingerprint' : 'fingerprints'}
          </span>
          <span className="tag">Practice: {boxLabel(practice.cards[original.id]).toLowerCase()}</span>
        </div>
      </div>

      <div className="stack--lg">
        <label className="field">
          <span className="field__label">Name</span>
          <input className="input" name="name" value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} autoComplete="off" />
        </label>

        <div className="panel whisper-panel">
          <label className="field__label" htmlFor="person-whisper">
            Whisper
          </label>
          <textarea
            id="person-whisper"
            className="whisper-panel__text"
            rows={Math.max(2, Math.ceil(draft.whisper.length / 22))}
            value={draft.whisper}
            onChange={(e) => set({ whisper: e.target.value, whisperSource: 'edited' })}
          />
          <div className="whisper-panel__foot">
            <button type="button" className="btn btn--quiet" onClick={() => set({ whisper: makeWhisper(draft.name, draft.note), whisperSource: 'rules' })}>
              Rewrite from note
            </button>
            <span className="spacer" />
            <button type="button" className="btn" onClick={() => hear(spokenLine(draft, getSettings().whisperStyle))}>
              <Play size={18} aria-hidden="true" /> Hear it
            </button>
          </div>
        </div>

        <label className="field">
          <span className="field__label">Your note</span>
          <textarea className="textarea" value={draft.note} onChange={(e) => set({ note: e.target.value })} rows={3} />
        </label>

        <h2>How to spot them</h2>
        {CUE_FIELDS.map((f) => (
          <label className="field" key={f.key}>
            <span className="field__label">{f.label}</span>
            <input className="input" value={draft.cues[f.key] ?? ''} onChange={(e) => set({ cues: { ...draft.cues, [f.key]: e.target.value } })} maxLength={80} autoComplete="off" />
          </label>
        ))}

        {dirty && (
          <div className="save-bar">
            <button type="button" className="btn btn--primary btn--block" onClick={save} disabled={saving} aria-busy={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}

        <h2>Photos</h2>
        <button type="button" className="btn btn--block" onClick={() => setAddingPhotos(true)}>
          <Camera size={20} aria-hidden="true" /> Add more photos
        </button>
        <button type="button" className="btn btn--block btn--danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={20} aria-hidden="true" /> Remove {original.name}
        </button>
      </div>

      <ConfirmSheet
        open={confirmDelete}
        title={`Remove ${original.name}?`}
        confirmLabel={`Remove ${original.name}`}
        danger
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      >
        Their fingerprints, note and whisper are deleted from this phone, and Whisper mode stops recognising them at once.
      </ConfirmSheet>
    </main>
  );
}
