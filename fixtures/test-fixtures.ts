import { test as base, expect } from '@playwright/test';
import { createPool, type Pool } from '@db/client';
import { buildDivision } from '@factories/division.factory';
import { DashboardPage } from '@pages/dashboard/dashboard.page';
import { HomePage } from '@pages/public/home.page';
import { UserOperationsHubPage } from '@pages/user-operations-hub/user-operations-hub.page';
import { DivisionsPage } from '@pages/user-operations-hub/divisions/divisions.page';
import type { Division } from '@typings/division.types';

/**
 * The suite's own `test`. Specs import `test` and `expect` from here, never from
 * `@playwright/test`, so a fixture added below reaches every spec. Page objects
 * get one fixture each.
 *
 * Every browser project carries the session the `setup` project saved, so a spec
 * that takes `dashboardPage` is already signed in. The sign-in spec is the one
 * exception and opts out with its own `test.use`.
 */

type WorkerFixtures = {
  /** The MySQL pool, one per worker. */
  db: Pool;
};

type TestFixtures = {
  /** The public home page, and the entry point to Register and Login. */
  homePage: HomePage;

  /** The dashboard a signed-in session lands on. */
  dashboardPage: DashboardPage;

  /** The User Operations Hub landing page, with the division metric card. */
  userOperationsHubPage: UserOperationsHubPage;

  /** The division list. */
  divisionsPage: DivisionsPage;

  /** Details for one division no other test in this run can name. Not yet created. */
  division: Division;
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

  /** This fixture provides the dashboard. */
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  /** This fixture provides the User Operations Hub landing page. */
  userOperationsHubPage: async ({ page }, use) => {
    await use(new UserOperationsHubPage(page));
  },

  /** This fixture provides the division list. */
  divisionsPage: async ({ page }, use) => {
    await use(new DivisionsPage(page));
  },

  /** This fixture generates the details for one division, unique to this test. */
  // Generated, not created: the create journeys are the ones under test, so the
  // fixture hands over values and leaves the creating to the spec.
  division: async ({}, use) => {
    await use(buildDivision());
  },
});

export { expect };
