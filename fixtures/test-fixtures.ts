import { test as base, expect } from '@playwright/test';
import { createPool, type Pool } from '@db/client';

/**
 * The suite's own `test`. Specs import `test` and `expect` from here, never from
 * `@playwright/test`, so a fixture added below reaches every spec. Page objects
 * get one fixture each.
 */

type WorkerFixtures = {
  /** The MySQL pool, one per worker. */
  db: Pool;
};

/** Test-scoped fixtures. Empty until the first page object lands. */
// `{}` not `Record<string, never>`, whose index signature would reject the
// worker fixtures.
type TestFixtures = {};

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
});

export { expect };
