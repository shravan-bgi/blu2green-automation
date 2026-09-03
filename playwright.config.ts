import { defineConfig, devices } from '@playwright/test';
// Relative rather than aliased: this file is loaded before tsconfig path
// mapping applies to it, and it is the one place that cannot rely on an alias.
import { environment } from './config/environment';

const isCI = Boolean(process.env.CI);

const allureReporter: [string, Record<string, unknown>] = [
  'allure-playwright',
  {
    resultsDir: 'allure-results',
    // Turns every Playwright action, assertion and hook into an Allure step.
    // Without it the report shows outcomes with no trace of how they were reached.
    detail: true,
    suiteTitle: true,
    environmentInfo: {
      BaseURL: environment.baseURL,
      Schema: environment.databaseSchema || 'not configured',
      Node: process.version,
      CI: String(isCI),
    },
    globalLabels: { framework: 'playwright', product: 'blu2green' },
  },
];

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',

  // Empties allure-results and the built report before anything runs, so the
  // report describes this run and not every run since they were last cleared by
  // hand; then builds and opens it afterwards, however the run went. Trend
  // history is kept elsewhere and survives both — see the files for why.
  // Relative for the same reason the environment import above is.
  globalSetup: './config/clean-allure-output.ts',
  globalTeardown: './config/open-allure-report.ts',

  fullyParallel: true,
  forbidOnly: isCI,
  // The demo environment is shared and single-instance. Pushing more browsers at
  // it slows every one of them and turns page loads into test timeouts.
  workers: isCI ? '50%' : 4,
  retries: isCI ? 2 : 0,

  // Generous because the application is slow under concurrent load, not because
  // anything here waits blindly: a cold reference-data load alone can take 30s.
  timeout: 150_000,
  expect: { timeout: 15_000 },
  globalTimeout: isCI ? 45 * 60_000 : 0,

  reporter: isCI
    ? [['list'], allureReporter, ['blob'], ['github']]
    : [
        ['list'],
        allureReporter,
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ],

  use: {
    baseURL: environment.baseURL,
    navigationTimeout: 45_000,
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isCI ? 'on-first-retry' : 'retain-on-failure',
    testIdAttribute: 'data-testid',
    // No global actionTimeout on purpose: it masks a genuinely slow
    // auto-waited action. Set it per action where a widget is known to be slow.
  },

  projects: [
    // Signs in once per run and saves the session the browser projects below
    // reuse. No storageState of its own — it is the thing that produces one.
    //
    // `--grep` is applied to dependency projects too, so any filtered run has to
    // keep @setup in its expression or this project matches nothing, no session
    // is written, and every test runs signed out. See the npm scripts.
    { name: 'setup', testMatch: /setup[\\/]auth\.setup\.ts/ },

    // The API specs, which drive no browser at all. Playwright launches one only
    // for a test that asks for `page`, so these run without it — but the project
    // still depends on setup, because that is what leaves a session on disk for
    // the bearer token to be read out of.
    {
      name: 'api',
      testMatch: /tests[\\/]api[\\/].*\.spec\.ts/,
      dependencies: ['setup'],
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: environment.storageState },
      dependencies: ['setup'],
      testIgnore: /tests[\\/]api[\\/]/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: environment.storageState },
      dependencies: ['setup'],
      testIgnore: /tests[\\/]api[\\/]/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: environment.storageState },
      dependencies: ['setup'],
      testIgnore: /tests[\\/]api[\\/]/,
    },
  ],
});
