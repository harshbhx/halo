import { BackButton } from '../components/ui';
import { useSettings } from '../lib/settings';

export function Privacy() {
  const { welcomeSeen } = useSettings();
  return (
    <main className={`screen${welcomeSeen ? '' : ' screen--flow'}`} aria-labelledby="privacy-title">
      <div className="topline">
        <BackButton to={welcomeSeen ? '/settings' : '/welcome'} />
      </div>
      <h1 id="privacy-title" className="title title--md" tabIndex={-1}>
        Privacy and honest limits
      </h1>
      <p className="lede">Face Whisper is built so that the people you add stay between you and your phone.</p>

      <div className="prose">
        <h2>What stays on this phone</h2>
        <ul>
          <li>
            <strong>Face fingerprints.</strong> Each photo you take is turned into 128 numbers by a small model running in your browser. The
            photo itself is thrown away; only the numbers and one small picture for your list are kept.
          </li>
          <li>
            <strong>Names, notes, whispers and cues.</strong> Stored in this browser's own database, encrypted with a key the browser creates
            and will not let anyone export.
          </li>
          <li>
            <strong>Settings</strong> such as voice and volume, which hold nothing personal.
          </li>
        </ul>

        <h2>What never happens</h2>
        <ul>
          <li>No photo, face, fingerprint or note is uploaded. There is no server, account or cloud.</li>
          <li>Faces that don't match someone you added are dropped straight after the comparison. Strangers are never stored or named.</li>
          <li>No ads, no analytics, no third-party scripts or fonts. It keeps working offline once loaded.</li>
        </ul>

        <h2>Voice notes</h2>
        <p>
          Dictation uses your browser's speech recognition. Where the browser can do that on the device, Face Whisper asks it to. Some browsers
          (for example Chrome on many phones) send the audio of your note to the browser maker's speech service instead. If you'd rather keep
          even that local, type the note, or use your keyboard's offline dictation.
        </p>

        <h2>Consent</h2>
        <p>
          Only add people who have agreed. The app asks you to confirm that for every person and records when you did. Delete someone the
          moment they change their mind.
        </p>

        <h2>Honest limits</h2>
        <ul>
          <li>Poor light, strong backlight, steep angles, masks, new glasses or a new beard can stop a match, or rarely cause a wrong one.</li>
          <li>Close relatives and look-alikes can be confused. That's why the app waits for a steady match and stays silent when unsure.</li>
          <li>
            <strong>Never use it for safety, security or identity decisions.</strong> It's a gentle reminder, not proof of who someone is.
          </li>
        </ul>

        <h2>Your control</h2>
        <ul>
          <li>Delete a person from their page. Whisper mode stops recognising them straight away.</li>
          <li>
            <strong>Delete everything</strong> in Settings removes every person, note and fingerprint, the encryption key and your settings.
          </li>
          <li>Clearing this site's data in your browser, or using a private window, also removes everything.</li>
        </ul>

        <h2>How it works</h2>
        <p>
          A tiny face detector finds faces in each camera frame, a landmark model lines them up, and a recognition model turns each into a
          fingerprint. A face counts as someone you know only when its fingerprint is close enough to theirs, clearly closer than to anyone
          else, and stays that way for three of the last four frames. Then the whisper is spoken by your browser's built-in voice.
        </p>
      </div>
    </main>
  );
}
