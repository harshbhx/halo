import { useEffect, useState } from 'react';
import { TabBar, Toaster } from './components/ui';
import { useRoute } from './lib/router';
import { startAutoLock, useLocked } from './lib/lock';
import { applyDocumentSettings, useSettings } from './lib/settings';
import { BRAND } from './brand';
import { Backup } from './screens/Backup';
import { DataControls, Wiped } from './screens/DataControls';
import { Help } from './screens/Help';
import { LockScreen } from './screens/LockScreen';
import { CardReceived } from './screens/CardReceived';
import { ConsentReceived } from './screens/ConsentReceived';
import { Enrol } from './screens/Enrol';
import { Home } from './screens/Home';
import { Person } from './screens/Person';
import { Practice } from './screens/Practice';
import { Privacy } from './screens/Privacy';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';
import { Welcome } from './screens/Welcome';
import { WhisperMode } from './screens/WhisperMode';

const WITH_TABS = ['home', 'person', 'today', 'practice', 'settings', 'privacy', 'backup', 'data', 'help'];

export function App() {
  const route = useRoute();
  const settings = useSettings();
  const locked = useLocked();
  const [update, setUpdate] = useState(false);

  // Auto-lock after the chosen minutes, except while Whisper mode is in use.
  useEffect(() => startAutoLock(() => location.hash.startsWith('#/whisper') || location.hash.startsWith('#/try')), []);

  // A new version waiting: offer it rather than switching under someone mid-conversation.
  useEffect(() => {
    const onUpdate = () => setUpdate(true);
    window.addEventListener('halo-update', onUpdate);
    return () => window.removeEventListener('halo-update', onUpdate);
  }, []);

  useEffect(() => applyDocumentSettings(settings), [settings]);

  // Screen readers: announce each screen by moving focus to its heading.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('main h1[tabindex="-1"]')?.focus({ preventScroll: true });
    });
    window.scrollTo({ top: 0 });
    document.querySelector('.shell')?.scrollTo({ top: 0 });
    return () => cancelAnimationFrame(id);
  }, [route.name, route.name === 'person' ? route.id : '']);

  // First run: the tour and the promise come before anything else.
  // The 60-second try works before the tour, so anyone can see Halo without a camera.
  const firstRun = !settings.welcomeSeen && !['privacy', 'try', 'wiped', 'help'].includes(route.name);

  if (locked && route.name !== 'wiped') {
    return (
      <div className="shell">
        <LockScreen />
        <Toaster />
      </div>
    );
  }

  let screen;
  if (firstRun || route.name === 'welcome') {
    screen = <Welcome />;
  } else {
    switch (route.name) {
      case 'enrol':
        screen = <Enrol />;
        break;
      case 'whisper':
        screen = <WhisperMode demo={route.demo} key={route.demo ? 'demo' : 'camera'} />;
        break;
      case 'try':
        screen = <WhisperMode demo guided key="try" />;
        break;
      case 'person':
        screen = <Person id={route.id} key={route.id} />;
        break;
      case 'today':
        screen = <Today />;
        break;
      case 'practice':
        screen = <Practice />;
        break;
      case 'settings':
        screen = <Settings />;
        break;
      case 'backup':
        screen = <Backup />;
        break;
      case 'consent':
        screen = <ConsentReceived data={route.data} />;
        break;
      case 'card':
        screen = <CardReceived data={route.data} />;
        break;
      case 'privacy':
        screen = <Privacy />;
        break;
      case 'data':
        screen = <DataControls />;
        break;
      case 'help':
        screen = <Help />;
        break;
      case 'wiped':
        screen = <Wiped />;
        break;
      default:
        screen = <Home />;
    }
  }

  const showTabs = !firstRun && settings.welcomeSeen && WITH_TABS.includes(route.name);
  return (
    <div className="shell">
      {update && (
        <div className="update-bar" role="status">
          <span>A new version of {BRAND.name} is ready.</span>
          <button type="button" className="btn btn--small" onClick={() => window.dispatchEvent(new Event('halo-apply-update'))}>
            Reload
          </button>
        </div>
      )}
      {screen}
      {showTabs && <TabBar route={route} />}
      <Toaster />
    </div>
  );
}
