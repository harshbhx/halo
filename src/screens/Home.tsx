import { ChevronRight, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Avatar, Brand, toast } from '../components/ui';
import { usePeople } from '../lib/people';
import { navigate } from '../lib/router';
import { loadSamplePeople, SAMPLE_AVAILABLE } from '../lib/demo';

function EmptyArt() {
  return (
    <svg className="empty__art" viewBox="0 0 132 132" aria-hidden="true">
      <circle cx="66" cy="66" r="62" fill="var(--accent-wash)" />
      <circle cx="58" cy="58" r="20" fill="var(--surface)" />
      <path d="M26 104c4-18 18-28 32-28s28 10 32 28" fill="var(--surface)" />
      <path d="M92 44c6 5 9 11 9 18s-3 13-9 18" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" />
      <path d="M103 34c9 8 14 17 14 28s-5 20-14 28" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function Home() {
  const { loaded, people, error } = usePeople();
  const [loadingSamples, setLoadingSamples] = useState(false);

  async function trySamples() {
    setLoadingSamples(true);
    try {
      const added = await loadSamplePeople();
      toast(`${added} sample people added. Open Whisper to try them.`);
    } catch {
      toast("Sample people couldn't load. Try again.");
    } finally {
      setLoadingSamples(false);
    }
  }

  return (
    <main className="screen" aria-labelledby="home-title">
      <div className="topline">
        <Brand />
        <button type="button" className="btn btn--quiet small" onClick={() => navigate('/privacy')}>
          <ShieldCheck size={20} aria-hidden="true" />
          On this phone only
        </button>
      </div>

      <h1 id="home-title" className="title" tabIndex={-1}>
        People you know
      </h1>
      <p className="lede">
        {people.length === 0
          ? 'Add the people you meet often. When your camera sees one of them, you hear who it is.'
          : `${people.length} ${people.length === 1 ? 'person' : 'people'}. Point your camera at one of them and you'll hear who it is.`}
      </p>

      {error && (
        <p className="notice" role="alert" style={{ marginTop: 18 }}>
          Storage isn't available in this browser window (private browsing can block it), so people can't be saved.
        </p>
      )}

      {loaded && people.length === 0 && (
        <section className="empty" aria-label="No one added yet">
          <EmptyArt />
          <h2 className="empty__title">No one added yet</h2>
          <p className="empty__body">Add someone who has agreed to it. It takes about 20 seconds: a few photos and a short note.</p>
          <div className="stack">
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => navigate('/enrol')}>
              <UserPlus size={22} aria-hidden="true" />
              Add someone
            </button>
            {SAMPLE_AVAILABLE && (
              <button type="button" className="btn btn--secondary btn--block" onClick={trySamples} disabled={loadingSamples}>
                <Sparkles size={20} aria-hidden="true" />
                {loadingSamples ? 'Preparing sample people…' : 'Try with sample people'}
              </button>
            )}
          </div>
          {SAMPLE_AVAILABLE && (
            <p className="field__hint" style={{ marginTop: 14 }}>
              Sample people are AI-generated faces of people who do not exist.
            </p>
          )}
        </section>
      )}

      {people.length > 0 && (
        <>
          <div style={{ marginTop: 22 }}>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => navigate('/enrol')}>
              <UserPlus size={22} aria-hidden="true" />
              Add someone
            </button>
          </div>
          <h2 className="section-label">Your people</h2>
          <ul className="person-list">
            {people.map((p, i) => (
              <li key={p.id} style={{ animationDelay: `${i * 40}ms` }}>
                <button type="button" className="person-row" onClick={() => navigate(`/person/${encodeURIComponent(p.id)}`)}>
                  <Avatar src={p.thumb} name={p.name} />
                  <span className="person-row__body">
                    <span className="person-row__name">
                      {p.name}
                      {p.sample && <span className="chip chip--warn">Sample</span>}
                    </span>
                    <span className="person-row__whisper">{p.whisper}</span>
                  </span>
                  <ChevronRight size={22} className="muted" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
