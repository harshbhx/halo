import { useEffect } from 'react';
import { BottomBar, Toaster } from './components/ui';
import { useRoute } from './lib/router';
import { useSettings } from './lib/settings';
import { Enrol } from './screens/Enrol';
import { Home } from './screens/Home';
import { WhisperMode } from './screens/WhisperMode';

export function App() {
  const route = useRoute();
  const settings = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  let screen;
  switch (route.name) {
    case 'enrol':
      screen = <Enrol />;
      break;
    case 'whisper':
      screen = <WhisperMode demo={route.demo} key={route.demo ? 'demo' : 'camera'} />;
      break;
    default:
      screen = <Home />;
  }

  const showBar = route.name !== 'enrol' && route.name !== 'whisper';
  return (
    <div className="app">
      {screen}
      {showBar && <BottomBar route={route} />}
      <Toaster />
    </div>
  );
}
