import { useEffect } from 'react';
import { TabBar, Toaster } from './components/ui';
import { useRoute } from './lib/router';
import { applyDocumentSettings, useSettings } from './lib/settings';
import { Backup } from './screens/Backup';
import { Enrol } from './screens/Enrol';
import { Home } from './screens/Home';
import { Person } from './screens/Person';
import { Practice } from './screens/Practice';
import { Privacy } from './screens/Privacy';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';
import { Welcome } from './screens/Welcome';
import { WhisperMode } from './screens/WhisperMode';

const WITH_TABS = ['home', 'person', 'today', 'practice', 'settings', 'privacy', 'backup'];

export function App() {
  const route = useRoute();
  const settings = useSettings();

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
  const firstRun = !settings.welcomeSeen && route.name !== 'privacy';

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
      case 'privacy':
        screen = <Privacy />;
        break;
      default:
        screen = <Home />;
    }
  }

  const showTabs = !firstRun && settings.welcomeSeen && WITH_TABS.includes(route.name);
  return (
    <>
      <div className="shell">
        {screen}
        {showTabs && <TabBar route={route} />}
        <Toaster />
      </div>
      <p className="desk-note">Made for phones. Everything runs in this browser; nothing is uploaded.</p>
    </>
  );
}
