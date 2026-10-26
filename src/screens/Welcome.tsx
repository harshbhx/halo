import { CloudOff, Ear, HeartHandshake, Lock, Trash2, UserX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { drawLamps } from '../lib/lights';
import { HaloMark } from '../components/ui';
import { navigate } from '../lib/router';
import { getSettings, updateSettings } from '../lib/settings';
import { speak, speechSupported, unlockAudio } from '../lib/voice';
import { BRAND } from '../brand';

/**
 * First run: a three-part tour. Who it's for, how it works, and the promise,
 * before anything is stored or any camera is opened.
 */
export function Welcome() {
  const [part, setPart] = useState(0);
  const last = part === 2;
  const lamps = useRef<HTMLCanvasElement>(null);
  const [heard, setHeard] = useState('');
  const ask = useRef<HTMLDivElement>(null);

  // The question appears under the sticky footer on a phone, so bring it into view.
  useEffect(() => {
    if (heard !== 'asked' || !ask.current) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ask.current.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
  }, [heard]);

  function checkEarbud() {
    unlockAudio();
    if (!speechSupported()) {
      setHeard('This browser has no voice. Names will still show on screen.');
      return;
    }
    const s = getSettings();
    void speak('This is how a whisper sounds.', { voiceName: s.voiceName, volume: s.volume, rate: s.rate, chimeSound: s.chimeSound });
    setHeard('asked');
  }

  useEffect(() => {
    const draw = () => lamps.current && drawLamps(lamps.current, { low: 0.72 });
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

  function start() {
    updateSettings({ welcomeSeen: true });
    navigate('/', true);
  }

  return (
    <main className="welcome" aria-labelledby="welcome-title">
      <div className="welcome__night">
        <canvas ref={lamps} className="welcome__lamps" aria-hidden="true" />
        <span className="wordmark">
          <HaloMark /> {BRAND.name}
        </span>
      </div>

      <div className="welcome__body" key={part}>
        <p className="tour-count" aria-live="polite">
          {part + 1} of 3
        </p>

        {part === 0 && (
          <>
            <h1 id="welcome-title" tabIndex={-1}>
              A quiet voice for faces you know.
            </h1>
            <p className="lead">
              For people with face blindness. Point your phone at someone you’ve added and your earbud quietly reminds you who it may be, and
              how you know them.
            </p>
            <figure className="quote">
              <p>“What we need is some dude saying in our ears "yes , you know that person it's insert name"”</p>
              <cite>u/Adventurous_Kiwi, on r/prosopagnosia</cite>
            </figure>
          </>
        )}

        {part === 1 && (
          <>
            <h1 id="welcome-title" tabIndex={-1}>
              Three steps, then it listens for you.
            </h1>
            <ol className="how">
              <li>
                <div>
                  <b>They say yes</b>
                  <span>You hand them the phone. They read their line and agree.</span>
                </div>
              </li>
              <li>
                <div>
                  <b>Three photos and a note</b>
                  <span>“Raj, my neighbour, had knee surgery” becomes one short line.</span>
                </div>
              </li>
              <li>
                <div>
                  <b>Hear who it is, when it’s sure</b>
                  <span>A soft ring settles on Raj and your earbud says his line. Not sure? It asks “Could be Raj?” and stays quiet.</span>
                </div>
              </li>
            </ol>
          </>
        )}

        {part === 2 && (
          <>
            <h1 id="welcome-title" tabIndex={-1}>
              Our promise, before you start.
            </h1>
            <ul className="promises">
              <li>
                <Lock size={20} aria-hidden="true" />
                <div>
                  <b>Faces never leave this phone</b>
                  <span>Recognition runs here. No account, no cloud, no API key.</span>
                </div>
              </li>
              <li>
                <HeartHandshake size={20} aria-hidden="true" />
                <div>
                  <b>Only people who said yes</b>
                  <span>Every person is added with their agreement.</span>
                </div>
              </li>
              <li>
                <UserX size={20} aria-hidden="true" />
                <div>
                  <b>Strangers stay strangers</b>
                  <span>Faces you didn’t add are never stored or named.</span>
                </div>
              </li>
              <li>
                <Ear size={20} aria-hidden="true" />
                <div>
                  <b>A hint, not proof</b>
                  <span>It can name the wrong person. Silence doesn’t mean a stranger. Never use it to decide who to trust.</span>
                </div>
              </li>
              <li>
                <CloudOff size={20} aria-hidden="true" />
                <div>
                  <b>Works offline</b>
                  <span>After the first visit it needs no connection.</span>
                </div>
              </li>
              <li>
                <Trash2 size={20} aria-hidden="true" />
                <div>
                  <b>Delete everything, any time</b>
                  <span>One button in Settings removes every person and the key.</span>
                </div>
              </li>
            </ul>
            <div className="stack">
              <button type="button" className="btn btn--block" onClick={checkEarbud}>
                <Ear size={18} aria-hidden="true" /> Check your earbud
              </button>
              {heard === 'asked' ? (
                <div className="stack" aria-live="polite" ref={ask}>
                  <p className="label">Did you hear “This is how a whisper sounds.” in your earbud?</p>
                  <div className="row">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        updateSettings({ speakAllowed: true });
                        setHeard('yes');
                      }}
                    >
                      Yes, in my earbud
                    </button>
                    <button type="button" className="btn btn--quiet" onClick={() => setHeard('no')}>
                      Not yet
                    </button>
                  </div>
                </div>
              ) : (
                <p className="label" aria-live="polite">
                  {heard === 'yes'
                    ? 'Whispers will be spoken. You can change this in Settings.'
                    : heard === 'no'
                      ? 'Fine: until you check again in Settings, you get a buzz and the name on screen, nothing spoken aloud.'
                      : heard}
                </p>
              )}
            </div>
          </>
        )}

        <div className="welcome__foot">
          {last ? (
            <button type="button" className="btn btn--primary btn--block" onClick={start}>
              I understand, let’s start
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--block" onClick={() => setPart(part + 1)}>
              Next
            </button>
          )}
          <div className="row">
            {part > 0 && (
              <button type="button" className="btn btn--quiet" onClick={() => setPart(part - 1)}>
                Back
              </button>
            )}
            {part === 0 && (
              <button type="button" className="btn btn--quiet" onClick={() => (unlockAudio(), navigate('/try'))}>
                See it in 60 seconds
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn--quiet" onClick={() => navigate('/privacy')}>
              Privacy and limits
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
