import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const isCI = process.env['CI'] !== undefined;

// E2E runs against the production build served by `vite preview` (ADR-0005).
// The `visual` project holds the screenshot baselines (M3.8): Chromium only, and
// not part of the per-browser e2e runs.
export default defineConfig({
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${String(port)}`,
    trace: 'on-first-retry',
    // The app's service worker (ADR-0013) would re-issue requests that page.route
    // can't see. tests/e2e/pwa.spec.ts opts back in.
    serviceWorkers: 'block',
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      // Absorbs anti-aliasing differences between machines, not layout changes.
      maxDiffPixelRatio: 0.01,
    },
  },
  // One baseline per screenshot, whatever the OS: the visual tests pin fonts.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  projects: [
    { name: 'chromium', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testDir: './tests/e2e', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testDir: './tests/e2e', use: { ...devices['Desktop Safari'] } },
    { name: 'visual', testDir: './tests/visual', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `pnpm exec vite build && pnpm exec vite preview --port ${String(port)} --strictPort`,
    url: `http://localhost:${String(port)}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
