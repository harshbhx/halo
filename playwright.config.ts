import { defineConfig } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Chromium's fake camera plays a Y4M clip of an AI-generated face (see scripts/make-fake-camera.sh).
const clip = (name: string) => resolve(here, 'demo/fake-camera', `${name}.y4m`);

const chromiumArgs = (video: string) => [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  `--use-file-for-fake-video-capture=${clip(video)}`,
  '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required',
];

const phone = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: false,
  hasTouch: true,
};

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    permissions: ['camera', 'microphone'],
  },
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'e2e',
      testMatch: /.*\.spec\.ts/,
      use: {
        ...phone,
        browserName: 'chromium',
        launchOptions: { args: chromiumArgs('friend') },
        screenshot: 'only-on-failure',
      },
    },
    {
      name: 'screens',
      testMatch: /screens\.record\.ts/,
      use: {
        ...phone,
        browserName: 'chromium',
        launchOptions: { args: chromiumArgs('friend') },
      },
    },
    {
      name: 'accuracy',
      testMatch: /accuracy\.record\.ts/,
      timeout: 900_000,
      use: { browserName: 'chromium', viewport: { width: 800, height: 600 }, launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
    },
    {
      name: 'record',
      testMatch: /(demo|landing|try)\.record\.ts/,
      use: {
        ...phone,
        browserName: 'chromium',
        launchOptions: { args: chromiumArgs('friend') },
        video: { mode: 'on', size: { width: 390, height: 844 } },
      },
    },
  ],
});
