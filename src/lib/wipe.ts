/**
 * Wipe now: everything Halo keeps in this browser, at once. The encrypted
 * store and its key, any other database, the offline cache, the service
 * worker, settings and the session. Then a plain "wiped" screen.
 */
import { navigate } from './router';
import { removeEveryone } from './people';
import { resetSettings } from './settings';
import { unlock } from './lock';

export async function wipeEverything(): Promise<void> {
  await removeEveryone().catch(() => undefined);
  try {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (d) =>
          new Promise<void>((done) => {
            if (!d.name) return done();
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => done();
          }),
      ),
    );
  } catch {
    // indexedDB.databases is missing in some browsers; the vault itself is already gone.
  }
  try {
    for (const key of await caches.keys()) await caches.delete(key);
  } catch {
    // no Cache Storage here
  }
  try {
    for (const reg of (await navigator.serviceWorker?.getRegistrations()) ?? []) await reg.unregister();
  } catch {
    // no service worker
  }
  resetSettings();
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // storage blocked
  }
  unlock();
  navigate('/wiped', true);
}
