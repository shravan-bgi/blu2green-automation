import { test as base, expect } from '@playwright/test';
import { createPool, type Pool } from '@db/client';
import { HomePage } from '@pages/public/home.page';

/**
 * The suite's own `test`. Specs import `test` and `expect` from here, never from
 * `@playwright/test`, so a fixture added below reaches every spec. Page objects
 * get one fixture each.
 */

type WorkerFixtures = {
  /** The MySQL pool, one per worker. */
  db: Pool;
};

type TestFixtures = {
  /** The public home page, and the entry point to Register and Login. */
  homePage: HomePage;
};

// No `identityLoginPage` fixture: the identity layer 404s on direct navigation,
// so its page object comes from `homePage.openLogin()`.

/** This object is the suite's extended `test`, carrying every fixture below. */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  /** This fixture opens a MySQL pool for the worker and closes it afterwards. */
  // Worker-scoped: a globalTeardown cannot see per-worker pools, so the run would
  // hang on open handles.
  db: [
    async ({}, use) => {
      const pool = createPool();
      await use(pool);
      await pool.end();
    },
    { scope: 'worker' },
  ],

  /** This fixture provides the public home page. */
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
});

export { expect };
