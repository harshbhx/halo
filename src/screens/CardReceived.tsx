import { UserPlus } from 'lucide-react';
import { BackButton } from '../components/ui';
import { readCard, setPendingCard } from '../lib/cardLink';
import { navigate } from '../lib/router';
import { makeWhisper } from '../lib/whisper';
import { cueItems } from '../lib/whisperStyle';

/** A helper prepared a card and sent it by link: check it, then start adding the person with it. */
export function CardReceived({ data }: { data: string }) {
  const card = readCard(data);
  return (
    <main className="screen" aria-labelledby="card-title">
      <div className="topbar">
        <BackButton to="/" label="Back to your people" />
      </div>
      {card ? (
        <div className="stack--lg">
          <div className="page-head">
            <h1 id="card-title" tabIndex={-1}>
              A card for {card.name}
            </h1>
            <p className="lead">
              {card.by ? `${card.by} prepared it` : 'Someone you trust prepared it'} on their phone. It came inside this link, as text: no photos, nothing
              through a server.
            </p>
          </div>
          <div className="panel whisper-panel">
            <span className="field__label">Halo would whisper</span>
            <p className="whisper-panel__text">{makeWhisper(card.name, card.note)}</p>
            {cueItems(card.cues).map((c) => (
              <p className="label" key={c.kind}>
                {c.label}: {c.text}
              </p>
            ))}
            {card.met && <p className="label">Where you met: {card.met}</p>}
          </div>
          <p className="muted">
            Nothing is added yet. Next you check the note, hand the phone to {card.name} so they can read the line and say yes, and take their photos
            together.
          </p>
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => {
              setPendingCard(card);
              navigate('/enrol', true);
            }}
          >
            <UserPlus size={20} aria-hidden="true" /> Start adding {card.name}
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => navigate('/', true)}>
            Not now
          </button>
        </div>
      ) : (
        <div className="page-head">
          <h1 id="card-title" tabIndex={-1}>
            This card link is incomplete.
          </h1>
          <p className="lead">Ask whoever sent it to make the card again.</p>
        </div>
      )}
    </main>
  );
}
