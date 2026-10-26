import { Check } from 'lucide-react';
import { BackButton } from '../components/ui';
import { readAnswer, setPendingConsent } from '../lib/consentLink';
import { navigate } from '../lib/router';

/** An answer came back by link: show it, then start adding them with it. */
export function ConsentReceived({ data }: { data: string }) {
  const answer = readAnswer(data);
  return (
    <main className="screen" aria-labelledby="consent-title">
      <div className="topbar">
        <BackButton to="/" label="Back to your people" />
      </div>
      {answer ? (
        <div className="stack--lg">
          <div className="page-head">
            <h1 id="consent-title" tabIndex={-1}>
              {answer.name} said yes.
            </h1>
            <p className="lead">They answered on their own phone, on {new Date(answer.at).toLocaleString()}. The answer came in this link, not through any server.</p>
          </div>
          <div className="panel whisper-panel">
            <span className="field__label">How they’d like to be introduced</span>
            <p className="whisper-panel__text">{answer.intro}</p>
            {answer.cue && <p className="label">To spot them: {answer.cue}</p>}
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => {
              setPendingConsent(answer);
              navigate('/enrol', true);
            }}
          >
            <Check size={20} aria-hidden="true" /> Add {answer.name}: take photos next time you meet
          </button>
        </div>
      ) : (
        <div className="page-head">
          <h1 id="consent-title" tabIndex={-1}>
            This answer link is incomplete.
          </h1>
          <p className="lead">Ask them to open your link again and send their answer back.</p>
        </div>
      )}
    </main>
  );
}
