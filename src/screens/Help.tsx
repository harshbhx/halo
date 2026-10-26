import { BackButton } from '../components/ui';
import { BRAND } from '../brand';
import { navigate } from '../lib/router';

const ios = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

/** Help and questions: getting the camera and microphone back, better matches, and plain answers. */
export function Help() {
  return (
    <main className="screen" aria-labelledby="help-screen-title">
      <div className="topbar">
        <BackButton to="/settings" label="Back to settings" />
      </div>
      <div className="page-head">
        <h1 id="help-screen-title" tabIndex={-1}>
          Help
        </h1>
        <p className="lead">Short answers. Nothing here needs an account or a connection.</p>
      </div>

      <div className="prose help">
        <h2 id="camera-help">The camera won’t start</h2>
        <ul>
          <li>
            <b>You said no to the camera before.</b>{' '}
            {ios
              ? 'On iPhone: Settings, then Safari (or your browser), then Camera, and choose Allow. Then come back and tap Try the camera again.'
              : 'Tap the camera or lock icon next to the address, choose Camera, then Allow, and reload. In Chrome on Android you can also go to Settings, Site settings, Camera.'}
          </li>
          <li>
            <b>Another app is using it.</b> Close video calls or the camera app, then try again.
          </li>
          <li>
            <b>The page isn’t secure.</b> Browsers only offer the camera on <code>https://</code> pages or on your own computer.
          </li>
          <li>
            No camera handy? <button type="button" className="link-btn" onClick={() => navigate('/try')}>Halo in 60 seconds</button> uses the demo camera.
          </li>
        </ul>

        <h2 id="mic-help">Dictation won’t start</h2>
        <ul>
          <li>Dictation is optional; typing always works and stays on the phone.</li>
          <li>
            {ios
              ? 'On iPhone, allow the microphone for your browser in Settings, and turn on Dictation in Settings, General, Keyboard.'
              : 'Tap the icon next to the address, choose Microphone, then Allow.'}
          </li>
          <li>Some browsers need a connection for dictation: their speech service turns your voice into text.</li>
        </ul>

        <h2 id="match-help">Getting better matches</h2>
        <ul>
          <li>
            <b>Light:</b> face the light, not a window behind them. In dim rooms Halo says so; a lamp or daylight helps more than anything.
          </li>
          <li>
            <b>Distance:</b> about an arm’s length to two metres. Far faces are too small to read.
          </li>
          <li>
            <b>Angle:</b> the face turned towards the camera. A profile is often “No match”.
          </li>
          <li>
            <b>Glasses, masks, hats:</b> add a photo of them with their usual glasses or hat. A mask hides most of what the face reader uses; expect silence or “Could be”.
          </li>
          <li>
            <b>Looks change:</b> after a haircut, a beard or new glasses, open them in People and Add more photos.
          </li>
          <li>
            <b>Look-alikes and relatives:</b> add cue notes that tell them apart. If one keeps being named wrongly, tap <b>Wrong person?</b> and follow the suggestion in Settings.
          </li>
        </ul>

        <h2 id="faq">Questions</h2>
        <dl className="faq-rows">
          <div>
            <dt>Does {BRAND.name} upload faces?</dt>
            <dd>No. Faces, photos and face fingerprints stay on your phone. The full answer is on the privacy page.</dd>
          </div>
          <div>
            <dt>Why didn’t it say anything?</dt>
            <dd>It speaks only when it’s sure, and only after you check your earbud. Silence doesn’t mean a stranger: light, angle or distance may be the reason.</dd>
          </div>
          <div>
            <dt>Can I use it without earbuds?</dt>
            <dd>Yes: choose Buzz or Silent in Settings, and read the name on screen. Without earbuds and with voice on, your phone speaks out loud.</dd>
          </div>
          <div>
            <dt>Does it work offline?</dt>
            <dd>Yes, after the first visit. Check that your phone has a voice “on this phone” in Settings if you want it to speak offline.</dd>
          </div>
          <div>
            <dt>Someone asked me to remove them.</dt>
            <dd>Open them in People and tap Remove, or use Your data. It’s immediate.</dd>
          </div>
          <div>
            <dt>I lost my phone.</dt>
            <dd>Your people are encrypted in the browser. If you set a {BRAND.name} lock, it asks for it on opening. There’s no account, so there’s nothing to log out of; a backup file restores them on a new phone.</dd>
          </div>
        </dl>

        <p>
          The full documents: <a href="../privacy/">Privacy</a>, <a href="../terms/">Terms</a> and <a href="../safety/">Safety</a>.
        </p>
      </div>
    </main>
  );
}
