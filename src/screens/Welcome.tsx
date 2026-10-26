import { HeartHandshake, Info, Lock } from 'lucide-react';
import { Brand } from '../components/ui';
import { navigate } from '../lib/router';
import { updateSettings } from '../lib/settings';

function Hero() {
  return (
    <div className="hero" aria-hidden="true">
      <svg viewBox="0 0 300 300">
        <defs>
          <radialGradient id="hero-glow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="var(--accent-wash)" />
            <stop offset="100%" stopColor="var(--bg)" />
          </radialGradient>
        </defs>
        <circle cx="150" cy="150" r="146" fill="url(#hero-glow)" />
        {/* the person you meet */}
        <circle cx="122" cy="128" r="44" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="2" />
        <path d="M52 250c8-50 38-78 70-78s62 28 70 78" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="2" />
        {/* the soft ring */}
        <ellipse cx="122" cy="126" rx="62" ry="74" fill="none" stroke="var(--ring)" strokeWidth="5" />
        <rect x="88" y="34" width="68" height="28" rx="14" fill="var(--ring)" />
        <text x="122" y="53" textAnchor="middle" fontSize="15" fontWeight="800" fill="#08241e" fontFamily="var(--font)">
          Raj
        </text>
        {/* the whisper */}
        <path className="hero__wave" d="M206 112c10 9 15 20 15 32s-5 23-15 32" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" />
        <path className="hero__wave hero__wave--2" d="M230 92c16 14 24 32 24 52s-8 38-24 52" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Welcome() {
  function start() {
    updateSettings({ welcomeSeen: true });
    navigate('/', true);
  }

  return (
    <main className="welcome" aria-labelledby="welcome-title">
      <div className="topline" style={{ marginBottom: 0 }}>
        <Brand />
      </div>
      <Hero />
      <div>
        <h1 id="welcome-title" className="title" tabIndex={-1}>
          Know who's in front of you.
        </h1>
        <p className="lede">
          For people with face blindness. Point your phone at someone you've added and hear, quietly, who they are and how you know them.
        </p>
      </div>

      <blockquote className="quote">
        "What we need is some dude saying in our ears 'yes, you know that person it's &lt;name&gt;'."
        <cite>Someone with prosopagnosia, r/prosopagnosia</cite>
      </blockquote>

      <div className="promises">
        <div className="promise">
          <div className="promise__head">
            <span className="promise__icon">
              <Lock size={20} aria-hidden="true" />
            </span>
            Faces never leave this phone
          </div>
          <p>Recognition runs on the device. No account, no cloud, no uploads, no API key.</p>
        </div>
        <div className="promise">
          <div className="promise__head">
            <span className="promise__icon">
              <HeartHandshake size={20} aria-hidden="true" />
            </span>
            Only people who said yes
          </div>
          <p>You add people with their agreement. Strangers are never stored or named.</p>
        </div>
        <div className="promise">
          <div className="promise__head">
            <span className="promise__icon">
              <Info size={20} aria-hidden="true" />
            </span>
            A quiet helper, not a judge
          </div>
          <p>It can be wrong in poor light or at odd angles. Never use it for safety or security decisions.</p>
        </div>
      </div>

      <div className="stack" style={{ marginTop: 6 }}>
        <button type="button" className="btn btn--primary btn--block btn--lg" onClick={start}>
          I understand, let's start
        </button>
        <button type="button" className="btn btn--quiet" onClick={() => navigate('/privacy')}>
          Read the full privacy promise
        </button>
      </div>
    </main>
  );
}
