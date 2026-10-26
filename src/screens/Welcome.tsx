import { CloudOff, Ear, HeartHandshake, Lock, Trash2, UserX } from 'lucide-react';
import { useT } from '../lib/i18n';
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
  const t = useT();
  const [part, setPart] = useState(0);
  const last = part === 2;
  const lamps = useRef<HTMLCanvasElement>(null);
  const [heard, setHeard] = useState('');
  const ask = useRef<HTMLDivElement>(null);

  // Each part of the tour is a new page for a screen reader: move focus to its heading.
  const firstPart = useRef(true);
  useEffect(() => {
    if (firstPart.current) {
      firstPart.current = false;
      return;
    }
    document.getElementById('welcome-title')?.focus({ preventScroll: true });
  }, [part]);

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
          {t('tour.count', { n: part + 1 })}
        </p>

        {part === 0 && (
          <>
            <h1 id="welcome-title" tabIndex={-1}>
              {t('tour.0.title')}
            </h1>
            <p className="lead">{t('tour.0.lead')}</p>
            <figure className="quote">
              <p>“What we need is some dude saying in our ears "yes , you know that person it's insert name"”</p>
              <cite>u/Adventurous_Kiwi, on r/prosopagnosia</cite>
            </figure>
          </>
        )}

        {part === 1 && (
          <>
            <h1 id="welcome-title" tabIndex={-1}>
              {t('tour.1.title')}
            </h1>
            <ol className="how">
              <li>
                <div>
                  <b>{t('tour.1.a.title')}</b>
                  <span>{t('tour.1.a.body')}</span>
                </div>
              </li>
              <li>
                <div>
                  <b>{t('tour.1.b.title')}</b>
                  <span>{t('tour.1.b.body')}</span>
                </div>
              </li>
              <li>
                <div>
                  <b>{t('tour.1.c.title')}</b>
                  <span>{t('tour.1.c.body')}</span>
                </div>
              </li>
            </ol>
          </>
        )}

        {part === 2 && (
          <>
            <h1 id="welcome-title" tabIndex={-1}>
              {t('tour.2.title')}
            </h1>
            <ul className="promises">
              <li>
                <Lock size={20} aria-hidden="true" />
                <div>
                  <b>{t('tour.2.a.title')}</b>
                  <span>{t('tour.2.a.body')}</span>
                </div>
              </li>
              <li>
                <HeartHandshake size={20} aria-hidden="true" />
                <div>
                  <b>{t('tour.2.b.title')}</b>
                  <span>{t('tour.2.b.body')}</span>
                </div>
              </li>
              <li>
                <UserX size={20} aria-hidden="true" />
                <div>
                  <b>{t('tour.2.c.title')}</b>
                  <span>{t('tour.2.c.body')}</span>
                </div>
              </li>
              <li>
                <Ear size={20} aria-hidden="true" />
                <div>
                  <b>{t('tour.2.d.title')}</b>
                  <span>{t('tour.2.d.body')}</span>
                </div>
              </li>
              <li>
                <CloudOff size={20} aria-hidden="true" />
                <div>
                  <b>{t('tour.2.e.title')}</b>
                  <span>{t('tour.2.e.body')}</span>
                </div>
              </li>
              <li>
                <Trash2 size={20} aria-hidden="true" />
                <div>
                  <b>{t('tour.2.f.title')}</b>
                  <span>{t('tour.2.f.body')}</span>
                </div>
              </li>
            </ul>
            <div className="stack">
              <button type="button" className="btn btn--block" onClick={checkEarbud}>
                <Ear size={18} aria-hidden="true" /> {t('tour.earbud')}
              </button>
              {heard === 'asked' ? (
                <div className="stack" aria-live="polite" ref={ask}>
                  <p className="label">{t('tour.earbud.q')}</p>
                  <div className="row">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        updateSettings({ speakAllowed: true });
                        setHeard('yes');
                      }}
                    >
                      {t('tour.earbud.yes')}
                    </button>
                    <button type="button" className="btn btn--quiet" onClick={() => setHeard('no')}>
                      {t('tour.earbud.no')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="label" aria-live="polite">
                  {heard === 'yes'
                    ? t('tour.earbud.yesDone')
                    : heard === 'no'
                      ? t('tour.earbud.noDone')
                      : heard}
                </p>
              )}
            </div>
          </>
        )}

        <div className="welcome__foot">
          {last ? (
            <button type="button" className="btn btn--primary btn--block" onClick={start}>
              {t('tour.start')}
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--block" onClick={() => setPart(part + 1)}>
              {t('tour.next')}
            </button>
          )}
          <div className="row">
            {part > 0 && (
              <button type="button" className="btn btn--quiet" onClick={() => setPart(part - 1)}>
                {t('tour.back')}
              </button>
            )}
            {part === 0 && (
              <button type="button" className="btn btn--quiet" onClick={() => (unlockAudio(), navigate('/try'))}>
                {t('tour.try')}
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn--quiet" onClick={() => navigate('/privacy')}>
              {t('tour.privacy')}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
