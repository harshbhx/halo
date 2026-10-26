import { Eye, RotateCcw, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar, EmptyState, Segmented, Wordmark } from '../components/ui';
import { usePeople } from '../lib/people';
import { boxLabel, choicesFor, daysThisWeek, duePeople, nextDue, roundMessage } from '../lib/practice';
import { navigate } from '../lib/router';
import { getSettings, updateSettings, useSettings, type PracticeKind } from '../lib/settings';
import { recordAnswer, usePractice } from '../lib/stores';
import type { Person } from '../lib/types';
import { haptic, speak, unlockAudio } from '../lib/voice';
import { cueItems } from '../lib/whisperStyle';

type Answer = { name: string; right: boolean } | null;

function whenText(time: number | null): string {
  if (!time) return '';
  const hours = Math.round((time - Date.now()) / 3_600_000);
  if (hours < 1) return 'in a few minutes';
  if (hours < 24) return `in about ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.round(hours / 24);
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
}

/**
 * Gentle practice with your own people. By default it asks from the cues
 * people with face blindness actually use (clothes, hair, voice); a photo round
 * is there too, because it helps some people and not others.
 */
export function Practice() {
  const { loaded, people } = usePeople();
  const practice = usePractice();
  const settings = useSettings();
  const [round, setRound] = useState<Person[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer>(null);
  const [named, setNamed] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const kind = settings.practiceKind;
  const usable = useMemo(() => (kind === 'cues' ? people.filter((p) => cueItems(p.cues).length > 0 || p.whisper) : people), [people, kind]);
  const due = useMemo(() => duePeople(usable, practice.cards, Date.now()), [usable, practice.cards]);
  const week = daysThisWeek(practice.days, Date.now());
  const multipleChoice = usable.length >= 3;

  function start() {
    setRound(due);
    setIndex(0);
    setNamed(0);
    setAnswer(null);
    setRevealed(false);
  }

  const current = round?.[index] ?? null;
  const choices = useMemo(() => (current ? choicesFor(current, usable) : []), [current, usable]);

  async function answerWith(name: string) {
    if (!current || answer) return;
    const right = name === current.name;
    setAnswer({ name, right });
    if (right) {
      setNamed((n) => n + 1);
      haptic(20);
    }
    await recordAnswer(current.id, right);
  }

  async function selfGrade(right: boolean) {
    if (!current) return;
    setAnswer({ name: current.name, right });
    if (right) setNamed((n) => n + 1);
    await recordAnswer(current.id, right);
  }

  function nextCard() {
    setAnswer(null);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  function hear(p: Person) {
    unlockAudio();
    const s = getSettings();
    void speak(p.whisper, { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chimeSound: 'off' });
  }

  const finished = round && index >= round.length;

  return (
    <main className="screen" aria-labelledby="practice-title">
      <div className="topbar">
        <Wordmark />
      </div>

      {!round && (
        <>
          <div className="page-head">
            <h1 id="practice-title" tabIndex={-1}>
              Practice with your people
            </h1>
            <p className="lead">A few calm minutes: see their cues, say who it is. Names come round again before you forget them.</p>
          </div>

          {loaded && people.length === 0 ? (
            <EmptyState
              title="Nothing to practise yet"
              actions={
                <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/enrol')}>
                  <UserPlus size={20} aria-hidden="true" /> Add someone
                </button>
              }
            >
              Practice uses the people you’ve added, their cues and their photo.
            </EmptyState>
          ) : (
            <div className="stack--lg">
              <div className="panel">
                <div className="panel__row">
                  <span className="panel__text">
                    <span className="panel__title">Days you practised this week</span>
                    <span className="panel__hint">No streak to break. Any day counts.</span>
                  </span>
                  <span className="week" aria-label={`${week} of 7 days`}>
                    {week}
                  </span>
                </div>
                <div className="panel__row panel__row--stack">
                  <span className="panel__title">Practise from</span>
                  <Segmented<PracticeKind>
                    label="Practise from"
                    value={kind}
                    options={[
                      { value: 'cues', label: 'Their cues' },
                      { value: 'photo', label: 'Their photo' },
                    ]}
                    onChange={(practiceKind) => updateSettings({ practiceKind })}
                  />
                  <span className="panel__hint">
                    {kind === 'cues'
                      ? 'Clothes, hair, voice and context: what many people with face blindness rely on.'
                      : 'Photos help some people and not others. Use it if it helps you.'}
                  </span>
                </div>
              </div>

              <button type="button" className="btn btn--primary btn--block" onClick={start} disabled={due.length === 0}>
                {due.length === 0 ? 'Everyone is fresh' : `Start (${due.length} ${due.length === 1 ? 'person' : 'people'})`}
              </button>
              {due.length === 0 && usable.length > 0 && (
                <p className="label">Nobody needs practice right now. The next one is ready {whenText(nextDue(usable, practice.cards, Date.now()))}.</p>
              )}

              <section className="section" aria-label="How each person is going">
                <ul className="people">
                  {usable.map((p) => (
                    <li key={p.id}>
                      <span className="person">
                        <Avatar src={p.thumb} name={p.name} />
                        <span className="person__body">
                          <span className="person__name">{p.name}</span>
                          <span className="person__line">{boxLabel(practice.cards[p.id])}</span>
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </>
      )}

      {round && current && !finished && (
        <div className="stack--lg">
          <div className="progress-line">
            <span>
              {index + 1} of {round.length}
            </span>
            <button type="button" className="btn btn--quiet" onClick={() => setRound(null)}>
              Stop
            </button>
          </div>

          <div className="panel practice-card" key={current.id}>
            <h1 id="practice-title" tabIndex={-1} className="visually-hidden">
              Who is this?
            </h1>
            {kind === 'photo' && current.thumb ? (
              <img className="practice-card__photo" src={current.thumb} alt="A photo of someone you’ve added" width={160} height={160} />
            ) : (
              <ul className="practice-card__cues">
                {cueItems(current.cues).map((c) => (
                  <li key={c.kind}>
                    <span>{c.label}</span>
                    {c.text}
                  </li>
                ))}
                {cueItems(current.cues).length === 0 && (
                  <li>
                    <span>How you know them</span>
                    {current.whisper.replace(new RegExp(`^${current.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,.]?\\s*`), '') || current.note}
                  </li>
                )}
              </ul>
            )}
            <p className="muted">Who is this?</p>
          </div>

          {multipleChoice ? (
            <div className="choices" role="group" aria-label="Choose a name">
              {choices.map((name) => (
                <button
                  type="button"
                  key={name}
                  className="btn btn--block choice"
                  disabled={!!answer}
                  data-state={answer ? (name === current.name ? 'right' : name === answer.name ? 'missed' : undefined) : undefined}
                  onClick={() => void answerWith(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : !revealed ? (
            <button type="button" className="btn btn--block" onClick={() => setRevealed(true)}>
              <Eye size={18} aria-hidden="true" /> Show the name
            </button>
          ) : (
            !answer && (
              <div className="stack">
                <p className="brief__name" style={{ textAlign: 'center' }}>
                  {current.name}
                </p>
                <div className="row">
                  <button type="button" className="btn btn--block" onClick={() => void selfGrade(false)}>
                    Not yet
                  </button>
                  <button type="button" className="btn btn--block" onClick={() => void selfGrade(true)}>
                    I knew it
                  </button>
                </div>
              </div>
            )
          )}

          {answer && (
            <div className="feedback" role="status">
              <strong>{answer.right ? `Yes, it’s ${current.name}.` : `That was ${current.name}.`}</strong>
              <span>{current.whisper}</span>
              <div className="row">
                <button type="button" className="btn btn--quiet" onClick={() => hear(current)}>
                  Hear it
                </button>
                <span className="spacer" />
                <button type="button" className="btn btn--primary" onClick={nextCard}>
                  {index + 1 < round.length ? 'Next person' : 'Finish'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {round && finished && (
        <div className="saved">
          <h1 id="practice-title" tabIndex={-1}>
            {roundMessage(named, round.length)}
          </h1>
          <p className="lead">You’ve practised on {week} {week === 1 ? 'day' : 'days'} this week.</p>
          <div className="stack" style={{ width: '100%' }}>
            <button type="button" className="btn btn--primary btn--block" onClick={() => setRound(null)}>
              Done
            </button>
            {duePeople(usable, practice.cards, Date.now()).length > 0 && (
              <button type="button" className="btn btn--block" onClick={start}>
                <RotateCcw size={18} aria-hidden="true" /> Another round
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
