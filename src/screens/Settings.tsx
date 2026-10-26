import { ChevronRight, Download, Play, ScanFace, ShieldCheck, Smartphone, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmSheet, Fader, Segmented, Switch, toast, Wordmark } from '../components/ui';
import { loadSamplePeople, removeSamplePeople, SAMPLE_AVAILABLE } from '../lib/demo';
import type { Strictness } from '../lib/matcher';
import { onDeviceModelAvailable } from '../lib/onDeviceModel';
import { removeEveryone, usePeople } from '../lib/people';
import { navigate } from '../lib/router';
import { resetSettings, updateSettings, useSettings, type ChimeSound, type OutputMode, type Theme } from '../lib/settings';
import { activeVoice, deliver, haptic, isOnDeviceVoice, loadVoices, pickDefaultVoice, playChime, speechSupported, unlockAudio } from '../lib/voice';
import { BUZZ, BUZZ_LABELS, inQuietHours } from '../lib/rules';
import { helperLink } from '../lib/cardLink';
import { shareLink } from '../lib/consentLink';
import { spokenLine, STYLE_LABELS, type WhisperStyle } from '../lib/whisperStyle';
import { WHISPER_LANGUAGES } from '../lib/enhanced';
import { BRAND } from '../brand';
import { BatteryRow, DataLinkRow, DocumentRows, LockSection, WrongMatchSection } from './SettingsMore';

const SAMPLE = { name: 'Raj', whisper: 'Raj, your neighbour. Knee surgery last month.', cues: { clothes: 'Green parka', glasses: 'Round glasses' } };

const REPEAT_OPTIONS = [
  { value: 20, label: 'After 20 seconds' },
  { value: 45, label: 'After 45 seconds' },
  { value: 90, label: 'After 90 seconds' },
  { value: 180, label: 'After 3 minutes' },
];

const OUTPUT_HINT: Record<OutputMode, string> = {
  voice: 'The whisper is spoken in your earbud.',
  chime: 'Only a soft chime; read the name on screen.',
  vibrate: 'Only a gentle buzz; read the name on screen.',
  silent: 'Nothing you can hear; names show on screen.',
};

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}

let deferredInstall: InstallPrompt | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e as InstallPrompt;
  });
}

export function Settings() {
  const settings = useSettings();
  const { people } = usePeople();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmEnhanced, setConfirmEnhanced] = useState(false);
  const [busySamples, setBusySamples] = useState(false);
  const [canInstall, setCanInstall] = useState(!!deferredInstall);
  const hasSamples = people.some((p) => p.sample);
  const standalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    void loadVoices().then(setVoices);
    void onDeviceModelAvailable().then(setModelReady);
    const onPrompt = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const defaultVoice = pickDefaultVoice(voices);
  const speaking = activeVoice(voices, settings.voiceName);
  const voiceOffline = voices.length === 0 || isOnDeviceVoice(speaking);

  function listen() {
    unlockAudio();
    void deliver(spokenLine(SAMPLE, settings.whisperStyle), settings.outputMode, {
      voiceName: settings.voiceName,
      volume: settings.volume,
      rate: settings.rate,
      chimeSound: settings.chimeSound,
      haptics: settings.haptics,
    });
  }

  async function toggleSamples() {
    setBusySamples(true);
    try {
      if (hasSamples) await removeSamplePeople();
      else await loadSamplePeople();
    } catch {
      toast('The sample people didn’t load. Try again.');
    } finally {
      setBusySamples(false);
    }
  }

  async function wipe() {
    setConfirmWipe(false);
    await removeEveryone();
    resetSettings();
    navigate('/welcome', true);
  }

  async function install() {
    if (!deferredInstall) return;
    await deferredInstall.prompt();
    deferredInstall = null;
    setCanInstall(false);
  }

  return (
    <main className="screen" aria-labelledby="settings-title">
      <div className="topbar">
        <Wordmark />
      </div>
      <div className="page-head">
        <h1 id="settings-title" tabIndex={-1}>
          Settings
        </h1>
        <p className="lead">Everything here stays on this phone.</p>
      </div>

      <section className="section" aria-labelledby="hear-title" style={{ marginTop: 0 }}>
        <h2 id="hear-title">How you hear it</h2>
        <div className="panel">
          <div className="panel__row panel__row--stack">
            <span className="panel__title">When someone is recognised</span>
            <Segmented<OutputMode>
              label="When someone is recognised"
              value={settings.outputMode}
              options={[
                { value: 'voice', label: 'Voice' },
                { value: 'chime', label: 'Chime' },
                { value: 'vibrate', label: 'Buzz' },
                { value: 'silent', label: 'Silent' },
              ]}
              onChange={(outputMode) => updateSettings({ outputMode })}
            />
            <span className="panel__hint">{OUTPUT_HINT[settings.outputMode]}</span>
          </div>
          <div className="panel__row panel__row--stack">
            <span className="panel__title">Whisper style</span>
            <Segmented<WhisperStyle>
              label="Whisper style"
              value={settings.whisperStyle}
              options={(Object.keys(STYLE_LABELS) as WhisperStyle[]).map((k) => ({ value: k, label: STYLE_LABELS[k].name }))}
              onChange={(whisperStyle) => updateSettings({ whisperStyle })}
            />
            <span className="panel__hint">“{spokenLine(SAMPLE, settings.whisperStyle)}”</span>
          </div>
          {speechSupported() ? (
            <>
              <label className="panel__row panel__row--stack">
                <span className="panel__title">Voice</span>
                <select className="select" value={settings.voiceName} onChange={(e) => updateSettings({ voiceName: e.target.value })}>
                  <option value="">Automatic{defaultVoice ? ` (${defaultVoice.name})` : ''}</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}, {v.lang}, {v.localService ? 'on this phone' : 'needs internet'}
                    </option>
                  ))}
                </select>
                {voiceOffline ? (
                  <span className="panel__hint">This voice is on your phone, so whispers keep working offline.</span>
                ) : (
                  <span className="notice" role="status">
                    This voice needs the internet. Pick one marked “on this phone” so whispers work offline; otherwise Halo shows the name on screen.
                  </span>
                )}
              </label>
              <div className="panel__row panel__row--stack">
                <div className="row">
                  <label className="panel__title spacer" htmlFor="volume">
                    Volume
                  </label>
                  <span className="level">{Math.round(settings.volume * 100)}</span>
                </div>
                <Fader id="volume" min={0.1} max={1} step={0.05} value={settings.volume} valueText={`${Math.round(settings.volume * 100)} percent`} onChange={(volume) => updateSettings({ volume })} />
              </div>
              <div className="panel__row panel__row--stack">
                <div className="row">
                  <label className="panel__title spacer" htmlFor="rate">
                    Speed
                  </label>
                  <span className="level">{settings.rate.toFixed(2)}</span>
                </div>
                <Fader id="rate" min={0.7} max={1.3} step={0.05} value={settings.rate} valueText={`${settings.rate.toFixed(2)} times normal speed`} onChange={(rate) => updateSettings({ rate })} />
              </div>
            </>
          ) : (
            <div className="panel__row">
              <span className="panel__text">
                <span className="panel__title">This browser has no voice</span>
                <span className="panel__hint">Names still show on screen in Whisper mode.</span>
              </span>
            </div>
          )}
          <div className="panel__row panel__row--stack">
            <span className="panel__title">Chime before a whisper</span>
            <Segmented<ChimeSound>
              label="Chime before a whisper"
              value={settings.chimeSound}
              options={[
                { value: 'two-notes', label: 'Two notes' },
                { value: 'bell', label: 'Bell' },
                { value: 'off', label: 'None' },
              ]}
              onChange={(chimeSound) => {
                unlockAudio();
                updateSettings({ chimeSound });
                void playChime(chimeSound, settings.volume);
              }}
            />
          </div>
          <div className="panel__row">
            <span className="panel__text">
              <span className="panel__title">Speak whispers aloud</span>
              <span className="panel__hint">
                Turn on once your earbuds are in. Without earbuds the phone speaks out loud. When off: a buzz and the name on screen.
              </span>
            </span>
            <Switch checked={settings.speakAllowed} onChange={(speakAllowed) => updateSettings({ speakAllowed })} label="Speak whispers aloud" />
          </div>
          <div className="panel__row">
            <span className="panel__text">
              <span className="panel__title">Gentle buzz</span>
              <span className="panel__hint">A short vibration first, on phones that have one.</span>
            </span>
            <Switch checked={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} label="Gentle buzz" />
          </div>
          <div className="panel__row">
            <button type="button" className="btn btn--primary btn--block" onClick={listen}>
              <Play size={18} aria-hidden="true" /> Listen
            </button>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="recognition-title">
        <h2 id="recognition-title">Recognition</h2>
        <div className="panel">
          <div className="panel__row panel__row--stack">
            <span className="panel__title">How sure before whispering</span>
            <Segmented<Strictness>
              label="How sure before whispering"
              value={settings.strictness}
              options={[
                { value: 'careful', label: 'Careful' },
                { value: 'balanced', label: 'Balanced' },
              ]}
              onChange={(strictness) => updateSettings({ strictness })}
            />
            <span className="panel__hint">
              {settings.strictness === 'careful'
                ? 'Speaks only when it’s sure, and stays quiet more often. Recommended.'
                : 'Speaks a little more readily, so it will be wrong a little more often.'}
            </span>
          </div>
          <label className="panel__row panel__row--stack">
            <span className="panel__title">Repeat the same person</span>
            <select className="select" value={settings.repeatSeconds} onChange={(e) => updateSettings({ repeatSeconds: Number(e.target.value) })}>
              {REPEAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="panel__row">
            <span className="panel__text">
              <span className="panel__title">Pause whispers</span>
              <span className="panel__hint">Whisper mode shows names quietly until you turn this off.</span>
            </span>
            <Switch checked={settings.whispersPaused} onChange={(whispersPaused) => updateSettings({ whispersPaused })} label="Pause whispers" />
          </div>
          <BatteryRow />
          <div className="panel__row">
            <span className="panel__text">
              <span className="panel__title" id="quiet-title">
                Quiet hours
              </span>
              <span className="panel__hint">
                {settings.quietHours.on
                  ? `Nothing aloud from ${settings.quietHours.from} to ${settings.quietHours.to}: a buzz and the name on screen instead.${inQuietHours(settings.quietHours, new Date()) ? ' On now.' : ''}`
                  : 'Nothing said aloud at set times, for example at night or at work.'}
              </span>
            </span>
            <Switch checked={settings.quietHours.on} onChange={(on) => updateSettings({ quietHours: { ...settings.quietHours, on } })} label="Quiet hours" />
          </div>
          {settings.quietHours.on && (
            <div className="panel__row time-row">
              <label className="field">
                <span className="field__label">From</span>
                <input
                  className="input"
                  type="time"
                  value={settings.quietHours.from}
                  onChange={(e) => e.target.value && updateSettings({ quietHours: { ...settings.quietHours, from: e.target.value } })}
                />
              </label>
              <label className="field">
                <span className="field__label">To</span>
                <input
                  className="input"
                  type="time"
                  value={settings.quietHours.to}
                  onChange={(e) => e.target.value && updateSettings({ quietHours: { ...settings.quietHours, to: e.target.value } })}
                />
              </label>
            </div>
          )}
          <p className="panel__row panel__hint">To keep one person from ever being said aloud, open them in People and turn on “Never whisper”.</p>
        </div>
      </section>

      <section className="section" aria-labelledby="pocket-title">
        <h2 id="pocket-title">Pocket mode</h2>
        <div className="panel">
          <p className="panel__row panel__hint">
            For when you’d rather not hold a phone up. Hang it at chest height on a lanyard or in a shirt pocket with the camera facing out, and turn on
            pocket mode in Whisper mode: the screen goes black and stays awake, and whispers go to your earbud. Without an earbud, Halo buzzes a code:
          </p>
          <ul className="buzz-list">
            {BUZZ_LABELS.map((b) => (
              <li key={b.code}>
                <span>{b.label}</span>
                <button type="button" className="btn btn--quiet" onClick={() => haptic([...BUZZ[b.code]])} aria-label={`Feel it: ${b.label}`}>
                  Feel it
                </button>
              </li>
            ))}
          </ul>
          <p className="panel__row panel__hint" data-pocket-limits>
            iPhone browsers can’t vibrate, so on an iPhone pocket mode needs an earbud. A locked screen stops the camera, so Halo asks the browser to keep the
            screen awake.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="helper-title">
        <h2 id="helper-title">Someone to help</h2>
        <div className="panel">
          <p className="panel__row panel__hint">
            A partner, parent or friend can prepare cards for people you’ll meet: who they are, how you know them, what to look for. They send each card
            back as a link; you check it and add the person when you meet. Text only, nothing uploaded.
          </p>
          <div className="panel__row">
            <button
              type="button"
              className="btn btn--block"
              onClick={async () => {
                const result = await shareLink(helperLink(location.origin), `${BRAND.name}: help me prepare cards`, `Could you help me prepare ${BRAND.name} cards?`);
                toast(result === 'copied' ? 'Helper link copied.' : result === 'shared' ? 'Helper link sent.' : 'Couldn’t share the link from this browser.');
              }}
            >
              Send a helper link
            </button>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="reading-title">
        <h2 id="reading-title">Reading</h2>
        <div className="panel">
          <div className="panel__row">
            <span className="panel__text">
              <span className="panel__title">Bigger text</span>
              <span className="panel__hint">Every screen, a size larger.</span>
            </span>
            <Switch checked={settings.bigText} onChange={(bigText) => updateSettings({ bigText })} label="Bigger text" />
          </div>
          <div className="panel__row">
            <span className="panel__text">
              <span className="panel__title">Higher contrast</span>
              <span className="panel__hint">Darker grey text and stronger lines.</span>
            </span>
            <Switch checked={settings.highContrast} onChange={(highContrast) => updateSettings({ highContrast })} label="Higher contrast" />
          </div>
          <div className="panel__row panel__row--stack">
            <span className="panel__title">Theme</span>
            <Segmented<Theme>
              label="Theme"
              value={settings.theme}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'light', label: 'Day' },
                { value: 'dark', label: 'Night' },
              ]}
              onChange={(theme) => updateSettings({ theme })}
            />
          </div>
          <div className="panel__row">
            <span className="panel__text">
              <span className="panel__title">On-device AI for whispers</span>
              <span className="panel__hint">
                {modelReady ? 'Your browser has a built-in model on this phone. Notes never leave it.' : 'Not in this browser, so built-in rules write each whisper, offline and keyless.'}
              </span>
            </span>
            <Switch checked={settings.useOnDeviceModel} onChange={(useOnDeviceModel) => updateSettings({ useOnDeviceModel })} label="On-device AI for whispers" />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="enhanced-title">
        <h2 id="enhanced-title">Enhanced mode</h2>
        <div className="panel">
          <div className="panel__row">
            <span className="panel__text">
              <span className="panel__title">Use Enhanced mode</span>
              <span className="panel__hint">
                Optional and off by default. Sends text only, never faces, photos or face fingerprints. Halo works fully without it.
              </span>
            </span>
            <Switch
              checked={settings.enhanced}
              onChange={(on) => (on ? setConfirmEnhanced(true) : updateSettings({ enhanced: false }))}
              label="Use Enhanced mode"
            />
          </div>
          {settings.enhanced && (
            <>
              <div className="panel__row">
                <span className="panel__text">
                  <span className="panel__title">Natural voice</span>
                  <span className="panel__hint">Made once per person, then kept on the phone and played offline.</span>
                </span>
                <Switch checked={settings.naturalVoice} onChange={(naturalVoice) => updateSettings({ naturalVoice })} label="Natural voice" />
              </div>
              <label className="panel__row panel__row--stack">
                <span className="panel__title">Whisper language</span>
                <select className="select" value={settings.whisperLang} onChange={(e) => updateSettings({ whisperLang: e.target.value })}>
                  {WHISPER_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <span className="panel__hint">Each whisper is translated once when you save someone, and stays editable. If the phone has no voice for the language, you see it on screen.</span>
              </label>
              <div className="panel__row">
                <span className="panel__text">
                  <span className="panel__title">Write whispers in the cloud</span>
                  <span className="panel__hint">For phones without an on-device model: sends the name and note you type.</span>
                </span>
                <Switch checked={settings.cloudWriter} onChange={(cloudWriter) => updateSettings({ cloudWriter })} label="Write whispers in the cloud" />
              </div>
            </>
          )}
        </div>
      </section>

      {SAMPLE_AVAILABLE && (
        <section className="section" aria-labelledby="demo-title">
          <h2 id="demo-title">Sample people</h2>
          <div className="panel">
            <div className="panel__row panel__row--stack">
              <span className="panel__hint">Three AI-generated faces of people who don’t exist, so you can try {BRAND.name} alone.</span>
              <button type="button" className="btn btn--block" onClick={toggleSamples} disabled={busySamples} aria-busy={busySamples}>
                <Sparkles size={18} aria-hidden="true" />
                {busySamples ? 'Working…' : hasSamples ? 'Remove sample people' : 'Add sample people'}
              </button>
              {hasSamples && (
                <button type="button" className="btn btn--block" onClick={() => (unlockAudio(), navigate('/whisper?demo=1'))}>
                  <ScanFace size={18} aria-hidden="true" /> Open the demo camera
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="data-title">
        <h2 id="data-title">Your data</h2>
        <div className="panel">
          <DataLinkRow />
          <button type="button" className="panel__row panel__link" onClick={() => navigate('/backup')}>
            <Download size={22} aria-hidden="true" />
            <span className="panel__text">
              <span className="panel__title">Back up or restore</span>
              <span className="panel__hint">A file you keep, locked with your passphrase.</span>
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <button type="button" className="panel__row panel__link" onClick={() => navigate('/privacy')}>
            <ShieldCheck size={22} aria-hidden="true" />
            <span className="panel__text">
              <span className="panel__title">Privacy and honest limits</span>
              <span className="panel__hint">What stays on this phone, and when not to rely on it.</span>
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <div className="panel__row">
            <button type="button" className="btn btn--block btn--danger" onClick={() => setConfirmWipe(true)}>
              <Trash2 size={18} aria-hidden="true" /> Delete everything
            </button>
          </div>
        </div>
      </section>

      <WrongMatchSection />

      <LockSection />

      <section className="section" aria-labelledby="help-title">
        <h2 id="help-title">Help</h2>
        <div className="panel">
          <div className="panel__row">
            <button type="button" className="btn btn--block" onClick={() => (updateSettings({ welcomeSeen: false }), navigate('/welcome'))}>
              Take the tour again
            </button>
          </div>
          <DocumentRows />
          {!standalone && (
            <div className="panel__row panel__row--stack">
              <span className="panel__title">Put it on your home screen</span>
              {canInstall ? (
                <button type="button" className="btn btn--block" onClick={install}>
                  <Smartphone size={18} aria-hidden="true" /> Install {BRAND.name}
                </button>
              ) : (
                <span className="panel__hint">
                  {ios ? 'In Safari, tap Share, then Add to Home Screen.' : 'In your browser menu, choose Install app or Add to Home screen.'}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <p className="label" style={{ marginTop: 'var(--space-xl)' }}>
        No account, no cloud. Made for people with face blindness.
      </p>

      <ConfirmSheet
        open={confirmEnhanced}
        title="Turn on Enhanced mode?"
        confirmLabel="Turn on, text only"
        onConfirm={() => {
          updateSettings({ enhanced: true });
          setConfirmEnhanced(false);
        }}
        onCancel={() => setConfirmEnhanced(false)}
      >
        <span className="stack">
          <span>{BRAND.name}’s own server (on Cloudflare, at the same address as this app) will receive only:</span>
          <ul className="sheet__list">
            <li>the exact line it will whisper, to make a natural voice or a translation, once per person</li>
            <li>a name and note you type, only if you turn on the cloud writer</li>
          </ul>
          <span>Never sent: faces, photos or face fingerprints. Nothing is stored there. Every request is listed in Privacy, under “What has left this phone”.</span>
        </span>
      </ConfirmSheet>

      <ConfirmSheet
        open={confirmWipe}
        title="Delete everything?"
        confirmLabel="Yes, delete everything"
        danger
        onConfirm={wipe}
        onCancel={() => setConfirmWipe(false)}
      >
        Every person, face fingerprint, note, whisper, practice record and setting is removed from this phone, with the encryption key. This
        can’t be undone.
      </ConfirmSheet>
    </main>
  );
}
