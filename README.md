# blu2green-automation

End-to-end tests for the [blu2green](https://demo.blu2green.earth) demo environment.
Playwright and TypeScript, with Allure reporting and direct MySQL reads for the assertions a
browser cannot make.

## Getting started

```bash
npm install
npx playwright install --with-deps chromium
cp .env.example .env      # fill in the database values
npm test
```

`.env` holds per-environment settings only — the base URL and database connection. Fixture
account values are test data and live in [data/auth.json](data/auth.json).

## Commands

| Command | What it runs |
| --- | --- |
| `npm test` | Everything on chromium, excluding `@quarantine` |
| `npm run test:smoke` | `@smoke` only — what gates a pull request |
| `npm run test:regression` | `@regression` only |
| `npm run test:cross-browser` | Firefox and WebKit |
| `npm run test:quarantine` | The quarantined tests, on their own |
| `npm run test:debug` | Playwright UI mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the JSDoc rule |
| `npm run allure:generate` | Build the Allure report |
| `npm run allure:open` | Serve it |

Both `typecheck` and `lint` must pass before anything is committed.

## Layout

```
pages/        page objects; components/ holds widgets belonging to no one page
fixtures/     test-fixtures.ts — the suite's own `test` and `expect`
config/       environment.ts, endpoints.ts, auth-cases.ts
db/           MySQL client and per-feature query modules
api/          HTTP clients for the API layer
data/         static test data
factories/    generated test data
types/        shared types
utils/        helpers belonging to no page object or fixture
tests/e2e/    UI specs
tests/api/    API specs
```

One path alias per top-level directory, so imports never use relative paths.

## Coverage

| Case | Journey |
| --- | --- |
| `TC_LOGIN_001` | Sign in by email address and reach the dashboard |
| `TC_LOGIN_002` | Sign in by mobile number and reach the dashboard |

Sign-in happens on the b2g Identity Layer at `nibe.businessgateways.com`, not in the
application — the journey crosses two origins and three tabs before landing on the
dashboard.

## CI

[GitHub Actions](.github/workflows/e2e.yml) runs the suite against the shared demo
environment. Tests are tiered by trigger: typecheck and lint on everything, `@smoke` on pull
requests, the full suite on merge to `main`, and the full suite plus Firefox and WebKit
nightly. Quarantined tests run everywhere and block nothing.

## Conventions

See [CLAUDE.md](CLAUDE.md) — layout, comment rules, locator preference order, tagging, and
the environment constraints that outrank generic advice. [.agents/qa-project-context.md](.agents/qa-project-context.md)
records what the project is: stack, environments, quality goals and risk areas.

<!-- CI path verification — this line is removed when the PR closes. -->
