import { BackButton } from '../components/ui';
import { useSettings } from '../lib/settings';
import { BRAND } from '../brand';

export function Privacy() {
  const { welcomeSeen } = useSettings();
  return (
    <main className="screen" aria-labelledby="privacy-title">
      <div className="topbar">
        <BackButton to={welcomeSeen ? '/settings' : '/welcome'} />
      </div>
      <div className="page-head">
        <h1 id="privacy-title" tabIndex={-1}>
          Privacy and honest limits
        </h1>
        <p className="lead">The people you add stay between you and your phone.</p>
      </div>

      <div className="prose">
        <h2>What stays on this phone</h2>
        <ul>
          <li>
            <b>Face fingerprints.</b> Each photo becomes 128 numbers, worked out by a small model inside your browser. The photo itself is
            thrown away; only the numbers and one small picture for your list are kept.
          </li>
          <li>
            <b>Names, notes, whispers, cues, today’s list and practice progress,</b> in this browser’s own database, encrypted with a key the
            browser creates and won’t let anyone export.
          </li>
          <li>
            <b>Settings</b> such as voice and volume, which hold nothing personal.
          </li>
        </ul>

        <h2>What never happens</h2>
        <ul>
          <li>No photo, face, fingerprint or note is uploaded. There’s no server, account or cloud.</li>
          <li>Faces that match no one you added are dropped straight after the comparison. Strangers are never stored or named.</li>
          <li>No ads, no analytics, no third-party scripts or fonts. After the first visit it works offline.</li>
        </ul>

        <h2>Voice notes</h2>
        <p>
          Dictation uses your browser’s speech recognition. Where the browser can do it on the phone, {BRAND.name} asks it to. Some browsers
          (Chrome on many phones, for example) send the audio of your note to the browser maker’s speech service instead. Typing keeps even
          that on the phone.
        </p>

        <h2>Backups</h2>
        <p>
          A backup is a file you save and keep. It’s locked with a passphrase you choose (PBKDF2 and AES-GCM), so the file alone shows
          nothing. Lose the passphrase and the backup can’t be opened, by anyone.
        </p>

        <h2>Consent</h2>
        <p>
          Only add people who agreed. You confirm it for every person, and the date is kept with them. Remove anyone the moment they change
          their mind.
        </p>

        <h2>Honest limits</h2>
        <ul>
          <li>Poor light, backlight, steep angles, masks, new glasses or a new beard can stop a match, or rarely cause a wrong one.</li>
          <li>Close relatives and look-alikes can be confused, so it waits for a steady match and stays quiet when unsure.</li>
          <li>
            <b>Never use it for safety, security or identity decisions.</b> It’s a gentle reminder, not proof of who someone is.
          </li>
        </ul>

        <h2>Your control</h2>
        <ul>
          <li>Remove a person from their page. Whisper mode stops recognising them at once.</li>
          <li>
            <b>Delete everything</b> in Settings removes every person, note, fingerprint, practice record and setting, and the encryption key.
          </li>
          <li>Clearing this site’s data in your browser, or using a private window, also removes everything.</li>
        </ul>

        <h2>How it works</h2>
        <p>
          A small face detector finds faces in each camera frame, a landmark model lines them up, and a recognition model turns each into a
          fingerprint. A face counts as someone you know only when it’s close enough to theirs, clearly closer than to anyone else, and stays
          that way for three of the last four frames. Then your browser’s own voice says the whisper.
        </p>
      </div>
    </main>
  );
}
