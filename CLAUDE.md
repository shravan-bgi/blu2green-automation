# blu2green automation — framework conventions

How this framework is built. Binding on every change; when a rule here disagrees with a
general recommendation from an installed skill, this file wins.

For what the *project* is — stack, environments, risk areas — see
[.agents/qa-project-context.md](.agents/qa-project-context.md). This file is the *how*.

## Layout

No `src/`. Tests are the product here, so there is no source-versus-tests boundary to draw.
One alias per top-level directory, mapped in [tsconfig.json](tsconfig.json).

```
pages/        page objects; components/ holds widgets belonging to no one page
fixtures/     test-fixtures.ts — the suite's own `test` and `expect`
config/       environment.ts (all config), endpoints.ts (routes and awaited endpoints)
db/           client.ts and per-feature query modules
api/          HTTP clients for the API layer
data/         static fixture data and files/
factories/    generated test data
types/        shared types
utils/        helpers belonging to no page object or fixture
tests/setup/  project dependencies, not specs — currently auth.setup.ts
tests/e2e/    UI specs
tests/api/    API specs
```

Page-object folders mirror `tests/` folders: a spec at `tests/e2e/auth/` reads page objects
from `pages/auth/`. Only `base.page.ts` and `components/` sit at the root of `pages/`,
because they belong to no one feature.

Every import goes through an alias (`@pages/auth/sign-in.page`), never a relative path, so a
file can move between folders without touching a single import. The one exception is
[playwright.config.ts](playwright.config.ts), which loads before path mapping applies.

## Comments

**Every method, getter, setter, exported function and exported const carries a JSDoc block
whose first line is a plain sentence.** Enforced by `jsdoc/require-jsdoc` in
[eslint.config.mjs](eslint.config.mjs) — lint fails without it.

```ts
/** This method enters the email into the email field. */
async enterEmail(email: string): Promise<void> {
  await this.emailField.fill(email);
}

/** This method submits the login form. */
async submitLoginForm(): Promise<void> {
  await this.submitButton.click();
}
```

Write "This method…", "This function…", "This fixture…", "This getter…". No `@param` or
`@returns` — on a two-line method the tags restate the signature and nothing more.

**A trap gets a second comment underneath, as `//` lines.** The JSDoc says what the code
does; the `//` note says why it is written the strange way it is. Add one only where the
code would otherwise mislead — if the reason is obvious from reading it, leave it out.

```ts
/** This getter returns the email input field. */
// Getter, not a field: with target ES2022 a field initialiser runs before the
// constructor assigns `page`, so an initialised locator would read undefined.
get emailField(): Locator {
  return this.page.locator('input[formcontrolname="email"]');
}
```

Constructors are exempt — every page object has one and it only ever stores `page`.
Specs are exempt: a test title already says what the test does.

## Page objects

- **Locators are getters, never initialised fields.** See the ES2022 note above.
- **Locator preference, in order:** `getByRole` / `getByLabel` / `getByText` → `data-testid`
  → structural (`formcontrolname`, ids, classes). A structural locator needs a `//` note
  saying which of the first two were tried and why they did not work. Never use Angular
  Material's generated `mat-input-N` ids — they shift as the DOM changes.
- **No assertions.** Page objects hold actions and getters. `expect()` lives in the spec.
  The exception is an internal wait that makes a method's own contract true — an
  `expect(...).toBeVisible()` guarding a mode switch is fine; asserting the thing under test
  is not.
- **No `waitForTimeout`.** Enforced by lint. Wait for a condition, never a duration.
- Every page object extends [`BasePage`](pages/base.page.ts) and declares its own `path`.

## Fixtures

Every page object is exposed as a fixture in [fixtures/test-fixtures.ts](fixtures/test-fixtures.ts):

```ts
signInPage: async ({ page }, use) => {
  await use(new SignInPage(page));
},
```

Specs import `test` and `expect` from `@fixtures/test-fixtures`, **never** from
`@playwright/test`. That is what lets a new fixture reach every spec without editing any of
them. The `db` pool is worker-scoped — a `globalTeardown` cannot see per-worker pools, so a
test-scoped one would hang the run on open handles.

### Authentication

The `setup` project ([tests/setup/auth.setup.ts](tests/setup/auth.setup.ts)) signs in **once
per run** and saves the session to `.auth/user.json`. Every browser project declares
`dependencies: ['setup']` and `use.storageState`, so a spec is already signed in — no test
logs in through the UI. The application keeps its session in `localStorage` and sets no
cookies, so `storageState` carries all of it.

[tests/e2e/auth/sign-in.spec.ts](tests/e2e/auth/sign-in.spec.ts) opts out with
`test.use({ storageState: { cookies: [], origins: [] } })`, because it is the suite that
signs in for itself.

The setup spec carries a `@setup` tag, which is deliberately **not** one of the four axes —
it is a project dependency, not a test. No `--grep` needs to mention it: a dependency project
runs whatever the filter says, verified on Playwright 1.62 with `--grep @smoke`. Do not add
`|@setup` to the npm scripts "to be safe"; it reads as though the filter were load-bearing
when it is not.

`.auth/user.json` is gitignored but survives between local runs, so a stale session can keep
a broken setup step from showing up locally. Delete `.auth/` when changing anything about
sign-in, so the next run proves the whole path.

## Tests

Title format: `TC_<JOURNEY>_<NNN> | Verify <behaviour>`. The behaviour half is a sentence a
non-engineer can read, because it is what appears in the Allure report.

The journey is finer-grained than the scope tag, and deliberately so: `TC_LOGIN_*` and a
later `TC_RESET_*` both sit under `@auth`, because the ID names the journey while the tag
names the feature area. Renaming a test orphans its Allure trend line, so pick the series
name before the first run, not after.

Four tag axes, and every test carries exactly one tag from each:

| Axis | Tags |
| --- | --- |
| Suite | `@smoke`, `@regression` |
| Scope | `@registration`, `@auth`, `@user-operations-hub`, … one per feature |
| Polarity | `@positive`, `@negative` |
| Layer | `@ui`, `@api` |

**Tags answer "when does this run", never "how much does it matter".** Severity is a
different question and lives in Allure metadata:

```ts
await allure.severity(allure.Severity.BLOCKER);
```

Keeping the two apart is what lets a regression test cover a critical area — impossible when
`@critical` and `@smoke` compete for one axis, which is why `@critical` is not a tag here.

`@quarantine` is separate and additive: it removes a test from every blocking CI job while
keeping it running and visible. Use it instead of `test.skip` or deletion, and pair it with
a ticket. See [.github/workflows/e2e.yml](.github/workflows/e2e.yml).

## Environment and data

- Read config only through [config/environment.ts](config/environment.ts). Never
  `process.env` in a spec, page object or query module.
- **The demo environment is shared, always-on, and never rebuilt per run.** No ephemeral
  database, no per-PR instance, no truncate-between-tests. This constraint outranks the
  generic advice in `test-environments` and parts of `test-data-management`, both of which
  assume you own and can rebuild the environment.
- The database user holds `UPDATE` but **not** `DELETE`. Data accumulates; reclaiming it
  needs a database-side job. Design fixtures around that rather than around cleanup.
- Database writes are confined to a named fixture account, never a range or a `WHERE`
  clause that could match a real registration.
- Test-owned accounts take an identifying email prefix so they are distinguishable from real
  registrations.

## Commands

```
npm run typecheck        tsc --noEmit
npm run lint             eslint, including the JSDoc rule
npm test                 chromium, excluding @quarantine
npm run test:smoke       @smoke only
npm run test:quarantine  the quarantined tests, on their own
npm run test:debug       Playwright UI mode
npm run allure:generate  build the Allure report from allure-results
```

Both `typecheck` and `lint` must pass before anything is committed.
