import { Pause, Play, ScanFace, Sparkles, UserPlus, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar, EmptyState, toast, Wordmark } from '../components/ui';
import { loadSamplePeople, SAMPLE_AVAILABLE } from '../lib/demo';
import { usePeople } from '../lib/people';
import { navigate } from '../lib/router';
import { getSettings, updateSettings, useSettings } from '../lib/settings';
import { speak, unlockAudio } from '../lib/voice';
import { spokenLine } from '../lib/whisperStyle';
import type { Person } from '../lib/types';

/** "Remind me how I know them": the whisper, on demand, from the list. */
function remind(person: Person) {
  unlockAudio();
  const s = getSettings();
  void speak(spokenLine(person, 'warm'), { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chimeSound: 'off' });
}

export function Home() {
  const { loaded, people, error } = usePeople();
  const settings = useSettings();
  const [loadingSamples, setLoadingSamples] = useState(false);
  const hasSamples = people.some((p) => p.sample);

  async function trySamples() {
    setLoadingSamples(true);
    try {
      await loadSamplePeople();
    } catch {
      toast('The sample people didn’t load. Try again.');
    } finally {
      setLoadingSamples(false);
    }
  }

  return (
    <main className="screen" aria-labelledby="home-title">
      <div className="topbar">
        <Wordmark />
        <button
          type="button"
          className="btn btn--quiet"
          aria-pressed={settings.whispersPaused}
          onClick={() => updateSettings({ whispersPaused: !settings.whispersPaused })}
        >
          {settings.whispersPaused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
          {settings.whispersPaused ? 'Whispers paused' : 'Pause whispers'}
        </button>
      </div>

      <div className="page-head">
        <h1 id="home-title" tabIndex={-1}>
          Your people
        </h1>
        {people.length > 0 && (
          <p className="lead">
            {people.length === 1 ? 'One person' : `${people.length} people`} your phone can recognise, each added with their agreement.
          </p>
        )}
      </div>

      {settings.whispersPaused && (
        <p className="notice notice--calm" role="status" style={{ marginBottom: 'var(--space-lg)' }}>
          <Pause size={18} aria-hidden="true" />
          Whispers are paused. Whisper mode still shows names on screen, quietly.
        </p>
      )}

      {error && (
        <p className="notice" role="alert" style={{ marginBottom: 'var(--space-lg)' }}>
          This browser window can’t save people (private browsing often blocks storage). Open Face Whisper in a normal window.
        </p>
      )}

      {loaded && people.length === 0 && (
        <EmptyState
          title="No one here yet"
          actions={
            <>
              <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/enrol')}>
                <UserPlus size={20} aria-hidden="true" />
                Add someone
              </button>
              {SAMPLE_AVAILABLE && (
                <button type="button" className="btn btn--block" onClick={trySamples} disabled={loadingSamples} aria-busy={loadingSamples}>
                  <Sparkles size={20} aria-hidden="true" />
                  {loadingSamples ? 'Preparing sample people…' : 'Try with sample people'}
                </button>
              )}
            </>
          }
        >
          Add someone you meet often who agreed to it: three photos and a short note, about twenty seconds. Sample people use
          AI-generated faces of people who don’t exist.
        </EmptyState>
      )}

      {people.length > 0 && (
        <>
          <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/enrol')}>
            <UserPlus size={20} aria-hidden="true" />
            Add someone
          </button>

          {hasSamples && (
            <section className="section" aria-labelledby="demo-title">
              <h2 id="demo-title">See it work without anyone else</h2>
              <p className="muted" style={{ marginBottom: 'var(--space-md)' }}>
                The demo camera plays the sample faces and one face you never added. Watch who gets a whisper, and who doesn’t.
              </p>
              <button
                type="button"
                className="btn btn--block"
                onClick={() => {
                  unlockAudio();
                  navigate('/whisper?demo=1');
                }}
              >
                <ScanFace size={20} aria-hidden="true" />
                Open the demo camera
              </button>
            </section>
          )}

          <section className="section" aria-label="Everyone you’ve added">
            <ul className="people">
              {people.map((p) => (
                <li key={p.id}>
                  <button type="button" className="person" onClick={() => navigate(`/person/${encodeURIComponent(p.id)}`)}>
                    <Avatar src={p.thumb} name={p.name} />
                    <span className="person__body">
                      <span className="person__name">
                        {p.name}
                        {p.sample && <span className="tag tag--sample">Sample</span>}
                      </span>
                      <span className="person__line">{p.whisper}</span>
                    </span>
                  </button>
                  <button type="button" className="icon-btn" onClick={() => remind(p)} aria-label={`Remind me how I know ${p.name}`}>
                    <Volume2 size={20} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
