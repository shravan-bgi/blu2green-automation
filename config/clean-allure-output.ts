import fs from 'fs';
import path from 'path';

/** This function empties the Allure results and the built report before a run starts. */
// `allure-playwright` appends. It writes a file per test and never clears what
// an earlier run left behind, so a report built from an uncleaned directory
// shows every run since somebody last deleted it by hand rather than the one
// that just finished.
//
// The built report goes too. Generating over the top of an old one leaves the
// pages of tests that no longer exist sitting in the output, so a renamed or
// deleted test lingers in the report it should have vanished from.
//
// Wired as Playwright's `globalSetup` rather than an npm script on purpose: a
// script only helps the people who use it, and the results pile up just as
// quietly for anyone running `npx playwright test` directly — which is how the
// directory reached twenty runs' worth in the first place.
//
// Trend history is deliberately left alone. It lives at `.allure/history.jsonl`,
// outside both directories, which is exactly what lets them be thrown away each
// run without losing the trend the report draws across runs.
export default function cleanAllureOutput(): void {
  for (const directory of ['allure-results', 'allure-report']) {
    const target = path.resolve(__dirname, '..', directory);

    fs.rmSync(target, { recursive: true, force: true });
  }

  fs.mkdirSync(path.resolve(__dirname, '..', 'allure-results'), { recursive: true });
}
