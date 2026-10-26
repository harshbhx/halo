import { useEffect } from 'react';
import { BottomBar, Toaster } from './components/ui';
import { useRoute } from './lib/router';
import { useSettings } from './lib/settings';
import { Enrol } from './screens/Enrol';
import { Home } from './screens/Home';
import { Person } from './screens/Person';
import { Privacy } from './screens/Privacy';
import { Settings } from './screens/Settings';
import { Welcome } from './screens/Welcome';
import { WhisperMode } from './screens/WhisperMode';

export function App() {
  const route = useRoute();
  const settings = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Screen readers: announce each screen by moving focus to its heading.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1[tabindex="-1"]');
      heading?.focus({ preventScroll: true });
    });
    window.scrollTo({ top: 0 });
    document.querySelector('.app')?.scrollTo({ top: 0 });
    return () => cancelAnimationFrame(id);
  }, [route.name, route.name === 'person' ? route.id : '']);

  // First run: the privacy promise comes before anything else.
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
      case 'settings':
        screen = <Settings />;
        break;
      case 'privacy':
        screen = <Privacy />;
        break;
      default:
        screen = <Home />;
    }
  }

  const showBar = !firstRun && settings.welcomeSeen && ['home', 'person', 'settings', 'privacy'].includes(route.name);
  return (
    <>
      <div className="app">
        {screen}
        {showBar && <BottomBar route={route} />}
        <Toaster />
      </div>
      <p className="desktop-note">Made for phones. Everything runs in this browser; nothing is uploaded.</p>
    </>
  );
}
