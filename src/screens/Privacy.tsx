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
        <ol>
          <li>A hint, not proof. It can name the wrong person, especially relatives, look-alikes and children. Never use it to decide who to trust or let in.</li>
          <li>Silence doesn’t mean a stranger. Dim light, side angles, masks, new glasses or a haircut can stop a match.</li>
          <li>
            It works better for some faces than others. Open face models make more mistakes for darker-skinned and East Asian faces, women, children
            and older people.
          </li>
          <li>It only knows people who said yes. It can’t look anyone up. Each face in view is measured for a moment, checked against your list, then forgotten.</li>
          <li>The app records that you asked them, but it can’t check. Remove anyone the moment they ask.</li>
          <li>A prototype, tested so far mainly on AI-generated faces, not yet with people who have face blindness. Without earbuds, your phone speaks out loud.</li>
        </ol>

        <h2>Why it works this way</h2>
        <p>People with face blindness have said what they want, and what they fear:</p>
        <ul>
          <li>
            “I'd like it to have only a database of people I actually care about... I want to know who they are and where I met them before. ... But just
            seeing the names of people standing in line next to me at the store or walking down the street would be both useless and overwhelming.”
            (u/EinsTwo)
          </li>
          <li>“It will happen but not for the good of people with disabilities like us, but for the surveillance state.” (u/Dez_Acumen)</li>
          <li>“...But would I want Meta knowing that much about me...” (on r/prosopagnosia)</li>
        </ul>
        <p>So {BRAND.name} knows only the people you add with their agreement, keeps everything on your phone, and has no server to send faces to.</p>

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
          that way for at least a second and five frames, including one where they face you. Only then does your browser’s own voice say the
          whisper. Closer than “maybe” but not sure, it shows “Could be …?” and stays quiet.
        </p>
      </div>
    </main>
  );
}
