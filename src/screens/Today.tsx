import { CalendarHeart, Ear, Play, Square, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar, EmptyState, Switch, Wordmark } from '../components/ui';
import { usePeople } from '../lib/people';
import { isoDay } from '../lib/practice';
import { navigate } from '../lib/router';
import { getSettings } from '../lib/settings';
import { saveToday, useToday } from '../lib/stores';
import { speak, stopSpeaking, unlockAudio } from '../lib/voice';
import { cueItems, spokenLine } from '../lib/whisperStyle';

/**
 * Who you'll see today: pick the people you expect at an event and read or
 * hear their lines before you walk in, so the context is fresh.
 */
export function Today() {
  const { loaded, people } = usePeople();
  const { list } = useToday();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef(false);

  const chosen = (list?.ids ?? []).map((id) => people.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  const showPicker = editing || !list || chosen.length === 0;

  useEffect(() => () => stopSpeaking(), []);

  function startEditing() {
    setTitle(list?.title ?? '');
    setPicked(list?.ids ?? []);
    setEditing(true);
  }

  async function save() {
    await saveToday({ title: title.trim(), ids: picked, day: isoDay(Date.now()), only: list?.only ?? false });
    setEditing(false);
    window.scrollTo({ top: 0 });
    document.querySelector('.shell')?.scrollTo({ top: 0 });
    document.getElementById('today-title')?.focus({ preventScroll: true });
  }

  async function playAll() {
    if (playing) {
      stopRef.current = true;
      stopSpeaking();
      setPlaying(false);
      return;
    }
    unlockAudio();
    stopRef.current = false;
    setPlaying(true);
    const s = getSettings();
    for (const person of chosen) {
      if (stopRef.current) break;
      await speak(spokenLine(person, 'full'), { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chimeSound: 'off' });
    }
    setPlaying(false);
  }

  return (
    <main className="screen" aria-labelledby="today-title">
      <div className="topbar">
        <Wordmark />
      </div>
      <div className="page-head">
        <h1 id="today-title" tabIndex={-1}>
          {list?.title && !showPicker ? list.title : 'Who you’ll see today'}
        </h1>
        <p className="lead">
          {showPicker
            ? 'Going somewhere? Pick who you expect, then read or hear their lines before you walk in.'
            : `${chosen.length === 1 ? 'One person' : `${chosen.length} people`} to expect. Their lines, ready before you arrive.`}
        </p>
      </div>

      {loaded && people.length === 0 && (
        <EmptyState
          title="Add people first"
          actions={
            <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/enrol')}>
              <UserPlus size={20} aria-hidden="true" /> Add someone
            </button>
          }
        >
          Today’s list is made from the people you’ve added.
        </EmptyState>
      )}

      {people.length > 0 && showPicker && (
        <form
          className="stack--lg"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="field">
            <span className="field__label">What’s the occasion? (optional)</span>
            <input className="input" name="occasion" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dinner at Priya’s" maxLength={60} autoComplete="off" />
          </label>
          <fieldset className="stack" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="field__label">Who will be there?</legend>
            {people.map((p) => (
              <label className="pick" key={p.id}>
                <input
                  type="checkbox"
                  checked={picked.includes(p.id)}
                  onChange={(e) => setPicked(e.target.checked ? [...picked, p.id] : picked.filter((id) => id !== p.id))}
                />
                <Avatar src={p.thumb} name={p.name} />
                <span className="person__body">
                  <span className="person__name">{p.name}</span>
                  <span className="person__line">{p.whisper}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <button type="submit" className="btn btn--primary btn--block" disabled={picked.length === 0}>
            <CalendarHeart size={20} aria-hidden="true" />
            {picked.length === 0 ? 'Pick at least one person' : `Make today’s list (${picked.length})`}
          </button>
          {editing && (
            <button type="button" className="btn btn--quiet" onClick={() => setEditing(false)}>
              Keep the current list
            </button>
          )}
        </form>
      )}

      {!showPicker && (
        <>
          <button type="button" className="btn btn--primary btn--block" onClick={playAll} aria-pressed={playing}>
            {playing ? <Square size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            {playing ? 'Stop' : 'Hear everyone’s line'}
          </button>
          <div className="panel event-panel">
            <div className="panel__row">
              <span className="panel__text">
                <span className="panel__title" id="event-only-title">
                  Event mode: only look for these people
                </span>
                <span className="panel__hint">
                  Whisper mode compares faces with this list alone: fewer people to mix up. Anyone else, even people you’ve added, is “No match” until you
                  turn this off.
                </span>
              </span>
              <Switch
                checked={!!list?.only}
                onChange={(only) => list && void saveToday({ ...list, only })}
                label="Event mode: only look for these people"
              />
            </div>
            {list?.only && (
              <div className="panel__row">
                <button type="button" className="btn btn--block" onClick={() => (unlockAudio(), navigate('/whisper'))}>
                  <Ear size={20} aria-hidden="true" /> Start Whisper mode for this event
                </button>
              </div>
            )}
          </div>
          <section className="section" aria-label="Today’s people">
            <ul className="brief">
              {chosen.map((p) => (
                <li key={p.id}>
                  <Avatar src={p.thumb} name={p.name} />
                  <div>
                    <p className="brief__name">{p.name}</p>
                    <p>{p.whisper}</p>
                    {cueItems(p.cues).length > 0 && (
                      <ul className="brief__cues">
                        {cueItems(p.cues).map((c) => (
                          <li key={c.kind}>
                            {c.label}: {c.text}
                          </li>
                        ))}
                      </ul>
                    )}
                    {p.met && <p className="brief__met">Where you met: {p.met}</p>}
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Hear ${p.name}’s line`}
                    onClick={() => {
                      unlockAudio();
                      const s = getSettings();
                      void speak(spokenLine(p, 'full'), { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chimeSound: 'off' });
                    }}
                  >
                    <Play size={18} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <div className="row" style={{ marginTop: 'var(--space-lg)' }}>
            <button type="button" className="btn btn--quiet" onClick={startEditing}>
              Change the list
            </button>
            <span className="spacer" />
            <button type="button" className="btn btn--quiet" onClick={() => void saveToday(null)}>
              Clear for tomorrow
            </button>
          </div>
          <p className="label" style={{ marginTop: 'var(--space-md)' }}>
            In Whisper mode, people on this list are marked “On today’s list”, and in pocket mode they buzz three times.
          </p>
        </>
      )}
    </main>
  );
}
