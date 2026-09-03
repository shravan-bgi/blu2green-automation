import { execFileSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/** This function builds the Allure report and opens it once the run has finished. */
// A `globalTeardown` rather than an npm `posttest` hook, for the reason that
// matters most: npm skips `post` scripts when the script they follow exits
// non-zero, so a hook would open the report after every run except the failing
// ones — which are the runs somebody actually wants to look at. Playwright runs
// this whichever way the tests went.
//
// Never in CI: there is no browser to open it in, no one to read it, and the
// pipeline publishes the report as an artifact instead.
//
// The server is spawned detached and unreferenced so the test process can exit
// without waiting on it. That does mean each local run leaves an Allure server
// running until it is closed — set ALLURE_OPEN=false to build the report without
// opening it.
export default function openAllureReport(): void {
  if (process.env.CI) return;

  const root = path.resolve(__dirname, '..');
  const results = path.join(root, 'allure-results');

  // A run that matched no tests writes nothing, and generating from an empty
  // directory fails noisily over something nobody asked for.
  if (!fs.existsSync(results) || fs.readdirSync(results).length === 0) return;

  try {
    execFileSync('npx', ['allure', 'generate', 'allure-results'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });

    // Built either way; only the opening is optional. Somebody who does not want
    // a browser window still wants the report waiting for them.
    if (process.env.ALLURE_OPEN === 'false') return;

    const server = spawn('npx', ['allure', 'open', 'allure-report'], {
      cwd: root,
      detached: true,
      stdio: 'ignore',
      shell: true,
    });

    server.unref();
  } catch (error) {
    // Reported, never thrown. The tests have already finished and their result
    // is the answer the run exists to give — failing it because a report could
    // not be drawn would be reporting the wrong thing.
    console.warn(
      `Could not build or open the Allure report: ${(error as Error).message}`,
    );
  }
}
