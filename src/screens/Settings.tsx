import { ChevronRight, Play, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Brand, ConfirmSheet, Segmented, Switch, toast } from '../components/ui';
import { loadSamplePeople, removeSamplePeople, SAMPLE_AVAILABLE } from '../lib/demo';
import { onDeviceModelAvailable } from '../lib/onDeviceModel';
import { removeEveryone, usePeople } from '../lib/people';
import { navigate } from '../lib/router';
import { resetSettings, updateSettings, useSettings, type Theme } from '../lib/settings';
import { loadVoices, pickDefaultVoice, speak, speechSupported, unlockAudio } from '../lib/voice';
import type { Strictness } from '../lib/matcher';

const REPEAT_OPTIONS = [
  { value: 20, label: 'After 20 seconds' },
  { value: 45, label: 'After 45 seconds' },
  { value: 90, label: 'After 90 seconds' },
  { value: 180, label: 'After 3 minutes' },
];

export function Settings() {
  const settings = useSettings();
  const { people } = usePeople();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [busySamples, setBusySamples] = useState(false);
  const hasSamples = people.some((p) => p.sample);

  useEffect(() => {
    void loadVoices().then(setVoices);
    void onDeviceModelAvailable().then(setModelReady);
  }, []);

  const defaultVoice = pickDefaultVoice(voices);

  function testVoice() {
    unlockAudio();
    void speak('Raj, your neighbour. Knee surgery last month.', {
      voiceName: settings.voiceName,
      volume: settings.volume,
      rate: settings.rate,
      chime: settings.chime,
    });
  }

  async function toggleSamples() {
    setBusySamples(true);
    try {
      if (hasSamples) {
        await removeSamplePeople();
        toast('Sample people removed');
      } else {
        const n = await loadSamplePeople();
        toast(`${n} sample people added`);
      }
    } catch {
      toast("Sample people couldn't load. Try again.");
    } finally {
      setBusySamples(false);
    }
  }

  async function wipe() {
    setConfirmWipe(false);
    await removeEveryone();
    resetSettings();
    toast('Everything was deleted from this phone');
    navigate('/welcome', true);
  }

  return (
    <main className="screen" aria-labelledby="settings-title">
      <div className="topline">
        <Brand />
      </div>
      <h1 id="settings-title" className="title" tabIndex={-1}>
        Settings
      </h1>

      <h2 className="section-label">Whisper voice</h2>
      <div className="group">
        {speechSupported() ? (
          <>
            <label className="group__row group__row--stack">
              <span className="group__title">Voice</span>
              <select className="input select" value={settings.voiceName} onChange={(e) => updateSettings({ voiceName: e.target.value })}>
                <option value="">Automatic{defaultVoice ? ` (${defaultVoice.name})` : ''}</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} · {v.lang}
                  </option>
                ))}
              </select>
            </label>
            <div className="group__row group__row--stack">
              <label className="group__title" htmlFor="volume">
                Volume
              </label>
              <div className="range-row">
                <input
                  id="volume"
                  className="range"
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={settings.volume}
                  onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
                />
                <span className="range-value">{Math.round(settings.volume * 100)}%</span>
              </div>
            </div>
            <div className="group__row group__row--stack">
              <label className="group__title" htmlFor="rate">
                Speed
              </label>
              <div className="range-row">
                <input
                  id="rate"
                  className="range"
                  type="range"
                  min={0.7}
                  max={1.3}
                  step={0.05}
                  value={settings.rate}
                  onChange={(e) => updateSettings({ rate: Number(e.target.value) })}
                />
                <span className="range-value">{settings.rate.toFixed(2)}×</span>
              </div>
            </div>
          </>
        ) : (
          <div className="group__row">
            <span className="group__text">
              <span className="group__title" style={{ display: 'block' }}>
                Speech isn't available in this browser
              </span>
              <span className="group__hint">Whispers still appear as captions in Whisper mode.</span>
            </span>
          </div>
        )}
        <div className="group__row">
          <span className="group__text">
            <span className="group__title" style={{ display: 'block' }}>
              Soft chime first
            </span>
            <span className="group__hint">Two quiet notes before each whisper.</span>
          </span>
          <Switch checked={settings.chime} onChange={(chime) => updateSettings({ chime })} label="Soft chime first" />
        </div>
        <div className="group__row">
          <button type="button" className="btn btn--secondary btn--block" onClick={testVoice}>
            <Play size={20} aria-hidden="true" /> Test the voice
          </button>
        </div>
      </div>

      <h2 className="section-label">Recognition</h2>
      <div className="group">
        <div className="group__row group__row--stack">
          <span className="group__title">How sure before whispering</span>
          <Segmented<Strictness>
            label="How sure before whispering"
            value={settings.strictness}
            options={[
              { value: 'careful', label: 'Careful' },
              { value: 'balanced', label: 'Balanced' },
            ]}
            onChange={(strictness) => updateSettings({ strictness })}
          />
          <span className="group__hint">
            {settings.strictness === 'careful'
              ? 'Fewer whispers, very rarely wrong. Recommended.'
              : 'Recognises more often in poor light, but may be wrong more often.'}
          </span>
        </div>
        <label className="group__row group__row--stack">
          <span className="group__title">Repeat the same person</span>
          <select className="input select" value={settings.repeatSeconds} onChange={(e) => updateSettings({ repeatSeconds: Number(e.target.value) })}>
            {REPEAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2 className="section-label">Writing whispers</h2>
      <div className="group">
        <div className="group__row">
          <span className="group__text">
            <span className="group__title" style={{ display: 'block' }}>
              Use on-device AI if available
            </span>
            <span className="group__hint">
              {modelReady
                ? "Your browser has a built-in model on this device. Notes never leave the phone."
                : "Not available in this browser, so built-in rules write the whisper. They work offline, with no key."}
            </span>
          </span>
          <Switch
            checked={settings.useOnDeviceModel}
            onChange={(useOnDeviceModel) => updateSettings({ useOnDeviceModel })}
            label="Use on-device AI if available"
          />
        </div>
      </div>

      <h2 className="section-label">Appearance</h2>
      <div className="group">
        <div className="group__row group__row--stack">
          <span className="group__title">Theme</span>
          <Segmented<Theme>
            label="Theme"
            value={settings.theme}
            options={[
              { value: 'system', label: 'Auto' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(theme) => updateSettings({ theme })}
          />
        </div>
      </div>

      {SAMPLE_AVAILABLE && (
        <>
          <h2 className="section-label">Demo</h2>
          <div className="group">
            <div className="group__row group__row--stack">
              <span className="group__hint">
                Sample people use AI-generated faces of people who do not exist, so you can try Face Whisper alone.
              </span>
              <button type="button" className="btn btn--secondary btn--block" onClick={toggleSamples} disabled={busySamples}>
                <Sparkles size={20} aria-hidden="true" />
                {busySamples ? 'Working…' : hasSamples ? 'Remove sample people' : 'Add sample people'}
              </button>
              {hasSamples && (
                <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('/whisper?demo=1')}>
                  Open the demo camera
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <h2 className="section-label">Privacy</h2>
      <div className="group">
        <button type="button" className="group__row group__link" onClick={() => navigate('/privacy')}>
          <ShieldCheck size={24} className="muted" aria-hidden="true" />
          <span className="group__text">
            <span className="group__title" style={{ display: 'block' }}>
              Privacy and honest limits
            </span>
            <span className="group__hint">What stays on this phone, and when not to rely on it.</span>
          </span>
          <ChevronRight size={22} className="muted" aria-hidden="true" />
        </button>
        <div className="group__row group__row--stack">
          <button type="button" className="btn btn--danger btn--block" onClick={() => setConfirmWipe(true)}>
            <Trash2 size={20} aria-hidden="true" /> Delete everything
          </button>
        </div>
      </div>

      <p className="footer-note">No account. No cloud. Made for people with face blindness.</p>

      <ConfirmSheet
        open={confirmWipe}
        title="Delete everything?"
        confirmLabel="Yes, delete everything"
        danger
        onConfirm={wipe}
        onCancel={() => setConfirmWipe(false)}
      >
        Every person, photo fingerprint, note, whisper and setting is removed from this phone, along with the encryption key. This can't be
        undone.
      </ConfirmSheet>
    </main>
  );
}
