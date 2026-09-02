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
      Schema: environment.database.schema,
      Node: process.version,
      CI: String(isCI),
    },
    globalLabels: { framework: 'playwright', product: 'blu2green' },
  },
];

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',

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
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
