import { defineConfig, devices } from '@playwright/test'

// Layout verification, not browser-compatibility testing: one engine, two
// viewports. The vitest suite runs in jsdom, which computes no layout at all —
// getBoundingClientRect() returns zeros and media queries never match — so
// every responsive rule in this app was unverifiable before this config
// existed. These tests are the only thing that can see a layout regression.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The HTML reporter produces playwright-report/, which `test:e2e:report`
  // opens and the CI job uploads.
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // 375x667 — iPhone SE. The narrowest mainstream phone still in wide
      // use, so it is the honest floor to design against.
      name: 'phone',
      // WHY THESE TWO OVERRIDES EXIST, do not simplify them away: in this
      // Playwright version devices['iPhone SE'] is 320x568 and WebKit. Without
      // them the phone project would silently test WebKit at 320px. Only
      // Chromium is installed (see CI job), so the engine and viewport are pinned.
      use: {
        ...devices['iPhone SE'],
        defaultBrowserType: 'chromium',
        viewport: { width: 375, height: 667 },
      },
    },
    {
      // A desktop pass so the mobile rules cannot be "fixed" by breaking the
      // layout the app was actually designed for.
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  // Tests run against the production build, not the dev server: the built page
  // carries the CSP meta tag injected by cspMeta() in vite.config.ts, and a CSP
  // violation that only appears in the build is exactly the kind of bug worth
  // catching here.
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
