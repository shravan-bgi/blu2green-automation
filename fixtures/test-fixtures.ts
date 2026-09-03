import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { bearerToken, tamperedBearerToken } from '@api/auth';
import { UserOperationsHubApi } from '@api/user-operations-hub.api';
import { environment } from '@config/environment';
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

  /**
   * The User Operations Hub service as the signed-in account, for the work a
   * test needs done but is not testing.
   */
  userOperationsHubApi: UserOperationsHubApi;

  /** Details for one division no other test in this run can name. Not yet created. */
  division: Division;

  /** A division that already exists, created through the API for this test alone. */
  existingDivision: Division;

  /**
   * A signed-in request context, for asserting the things the typed client
   * hides — status codes, response headers, and raw bodies.
   */
  authenticatedApi: APIRequestContext;

  /** A request context carrying no credentials at all, for the auth boundary. */
  anonymousApi: APIRequestContext;

  /** A request context carrying a token whose signature has been corrupted. */
  tamperedApi: APIRequestContext;
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

  /** This fixture provides a signed-in request context. */
  // The token is read at request time rather than baked into the config, so
  // nothing here holds a credential that can go stale between runs.
  authenticatedApi: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: environment.baseURL,
      extraHTTPHeaders: {
        Authorization: bearerToken(),
        // The application posts its JSON as text/plain and the service accepts
        // it either way; this is the honest one.
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
      },
    });

    await use(context);
    await context.dispose();
  },

  /** This fixture provides the User Operations Hub service, signed in. */
  // Built on the same context the raw fixture hands out, so a contract test
  // asserting headers and a journey test seeding data are talking to the service
  // through exactly one configuration.
  userOperationsHubApi: async ({ authenticatedApi }, use) => {
    await use(new UserOperationsHubApi(authenticatedApi));
  },

  /** This fixture generates the details for one division and removes it afterwards. */
  // Generated, not created: the create journeys are the ones under test, so the
  // fixture hands over values and leaves the creating to the spec.
  //
  // Teardown deletes by this exact name rather than by diffing the listing. The
  // suite runs fully parallel against one shared company and the delete is
  // permanent, so anything removing "whatever is new" would take another
  // worker's division with it. A name that was never created is nothing to do
  // rather than a failure, which is the normal outcome for the duplicate case.
  division: async ({ userOperationsHubApi }, use) => {
    const division = buildDivision();

    await use(division);

    await userOperationsHubApi.deleteDivisionNamed(division.name);
  },

  /** This fixture creates one division through the API for a test that needs one to act on. */
  // Per test, not per file: the edit and delete journeys change the thing they
  // are given, so two tests sharing a division is the one arrangement that
  // cannot be made safe. Created through the service rather than the form
  // because creating is not what these tests are about — the form costs a full
  // journey, and the create suite already proves it green on every run.
  //
  // Teardown goes by the key the create returned, so it removes the division
  // this test made even if the test renamed it, which the edit journeys do.
  existingDivision: async ({ userOperationsHubApi }, use) => {
    const division = buildDivision();
    const pk = await userOperationsHubApi.createDivision(division);

    await use(division);

    await userOperationsHubApi.deleteDivision(pk);
  },

  /** This fixture provides a request context with no Authorization header. */
  // Deliberately identical to the signed-in context but for the credential, so a
  // test using it is asking exactly one question: does authentication matter here.
  anonymousApi: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: environment.baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
      },
    });

    await use(context);
    await context.dispose();
  },

  /** This fixture provides a request context whose token signature is corrupted. */
  tamperedApi: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: environment.baseURL,
      extraHTTPHeaders: {
        Authorization: tamperedBearerToken(),
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
      },
    });

    await use(context);
    await context.dispose();
  },
});

export { expect };
