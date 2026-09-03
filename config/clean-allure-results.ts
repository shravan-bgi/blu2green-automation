import fs from 'fs';
import path from 'path';

/** This function empties the Allure results directory before a run starts. */
// `allure-playwright` appends. It writes a file per test and never clears what
// an earlier run left behind, so a report built from an uncleaned directory
// shows every run since somebody last deleted it by hand rather than the one
// that just finished.
//
// Wired as Playwright's `globalSetup` rather than an npm script on purpose: a
// script only helps the people who use it, and the results pile up just as
// quietly for anyone running `npx playwright test` directly — which is how the
// directory reached twenty runs' worth in the first place.
//
// Trend history is deliberately left alone. It lives at `.allure/history.jsonl`,
// outside this directory, which is exactly what lets the results be thrown away
// without losing the trend the report draws across runs.
export default function cleanAllureResults(): void {
  const results = path.resolve(__dirname, '..', 'allure-results');

  fs.rmSync(results, { recursive: true, force: true });
  fs.mkdirSync(results, { recursive: true });
}
