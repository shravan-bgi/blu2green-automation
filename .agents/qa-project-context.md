# QA project context

The file every QA skill reads first. Records what the *project* is. How the framework is
built — layout, comment rules, locator strategy, tagging — lives in
[CLAUDE.md](../CLAUDE.md) and is deliberately not repeated here.

Last updated 2026-09-02.

## Product

**blu2green** — a supplier registration and management platform for Business Gateways
International. Organizations register, are classified into an enterprise tier that carries
an entitlement, and then manage users and operations through an authenticated dashboard.

Type: B2B SaaS, single site.

Key user journeys, in priority order:

1. An organization in Oman registers: fills the form, verifies its business email by OTP,
   accepts terms, submits, and receives a registration number.
2. An organization outside Oman registers — a materially different request, not the same one
   with a different dropdown value.
3. A newly registered applicant sets a password and a six-digit PIN from the success modal.
4. A registered user signs in and reaches the dashboard. **Rebuilt by the product team in
   September 2026; the new flow has not been automated yet.**
5. A user resets a forgotten password, or a forgotten PIN, by emailed OTP.
6. An administrator adds a division and attaches a logo through the b2g Drive file picker.
   **Automated — `TC_DIV_CREATE_001`–`005`.** Editing and deleting a division are the next
   two passes and are not covered yet.
7. Duplicate details are refused at registration — organization name, mobile and commercial
   number per country, business email globally.

## Tech Stack

Application under test — not owned by this repository:

- **Frontend:** Angular with Angular Material. Outcome dialogs are SweetAlert2. A b2g Drive
  micro-frontend (`app-elev8drive-fe`) handles all file attachment.
- **Backend:** REST under `/usermg/web/...` and `/micro/web/master/...`.
- **Database:** MySQL 8 on AWS RDS (`ap-south-1`). `bgi_b2g_reg_dev` holds registrations,
  companies and accounts; `bgi_b2g_master_dev` holds reference data.
- **Third party:** Zoho SalesIQ chat widget, NIBE bridge push on registration.

This repository:

- **Runtime:** Node 24 locally, Node 22 in CI. TypeScript, CommonJS, `strict` plus
  `noUncheckedIndexedAccess` and `noUnusedLocals`.
- Not a monorepo. One suite, one site.

## Test Stack

### E2E / Integration

- **Framework:** Playwright 1.62.1 (`@playwright/test`)
- **Config:** `playwright.config.ts`
- **Test directory:** `tests/e2e/`, plus `tests/setup/` for the sign-in-once `setup` project
- **Current state:** twelve tests over three journeys, plus the sign-in-once setup.
  - Sign in — `TC_LOGIN_001` (email identifier) and `TC_LOGIN_002` (mobile identifier),
    driven from `data/sign-in.json`. The only specs that sign in through the UI.
  - Add a division — `TC_DIV_CREATE_001`–`005`, covering the mandatory-fields path, a logo
    attached from the b2g Drive, the duplicate-name refusal, and propagation into the Add
    Department and Add User division dropdowns.
  - Edit a division — `TC_DIV_EDIT_001`–`005`, covering a valid change, Cancel, the two
    Update-disabled guards, and the protected system-default division.
- **Test data:** seeded and torn down through the user-management API (`api/`), not the UI —
  a UI arrange costs a full journey. Responses are schema-validated with Zod 4.
- **Authentication:** a `setup` project signs in once per run and saves `storageState`; every
  browser project depends on it, and dependency projects run regardless of `--grep`.
- **Counting assertions:** the division counters are asserted for *agreement* (metric card =
  tile = chip = table), never as a `+1` delta. The environment is shared and the suite is
  fully parallel, so a delta races every other worker; agreement holds regardless and is what
  a drifting counter actually breaks.

### API

- **Framework:** Playwright `APIRequestContext` — planned, not written.
- **Test directory:** `tests/api/` (empty), clients in `api/` (empty).

### Unit / Component / Visual / Performance

None selected yet, and none currently warranted — this repository contains no application
code to unit test.

### Supporting

- **Reporting:** Allure 3 (`allure` 3.16, `allure-playwright` 3.11), history carried between
  runs in `.allure/history.jsonl`. Playwright HTML report locally, blob + `merge-reports` in CI.
- **Database access:** `mysql2` 3.23 pool, worker-scoped.
- **Test data:** `@faker-js/faker` 10.6.
- **Lint:** ESLint 9 with `eslint-plugin-playwright` and `eslint-plugin-jsdoc`.

## CI/CD

**Platform:** GitHub Actions — `.github/workflows/e2e.yml`, with a shared composite setup
action at `.github/actions/setup`.

Trigger-to-suite map:

| Trigger | Runs | Blocking |
| --- | --- | --- |
| Every trigger | typecheck + lint | Yes |
| Pull request | `@smoke`, chromium, 3 shards | Yes |
| Push to `main` | Full suite, chromium, 3 shards | Yes |
| Nightly 02:00 UTC | Full suite + firefox + webkit | Alert only |
| Every trigger | `@quarantine`, `continue-on-error` | No |

`--fail-on-flaky-tests` applies to the full and cross-browser jobs only. Every test job
passes `--pass-with-no-tests`, because the suite is young and a tag can legitimately
match nothing. Blocking jobs pass `--grep-invert @quarantine`.

**Artifacts:** blob reports (1 day), Allure results (7 days), Allure report (30 days), Allure
history (90 days), merged Playwright HTML report (14 days) — all on `if: !cancelled()`.

**Deploy gating:** none. This repository deploys nothing; it tests a shared environment
someone else deploys.

**Failure notification:** an explicit email to `shravan@businessgateways.com` on any failing
run, sent by the `notify-failure` job. GitHub's own Actions email reaches only whoever
triggered a run, and a nightly cron has no triggering actor — so the tier most likely to catch
real breakage was the one least likely to be seen. The quarantine job is excluded on purpose:
it is non-blocking, and a quarantined test failing is expected rather than news.

**Secrets required:** `DEMO_DB_HOST`, `DEMO_DB_PORT`, `DEMO_DB_NAME`, `DEMO_DB_USER`,
`DEMO_DB_PASSWORD`, plus `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` for the
notification. Repository variable: `DEMO_BASE_URL`.

**No login credentials in CI.** The fixture account is test data — its password is the static
one every test account on the demo environment carries — so it lives in `data/sign-in.json` and
needs no secret. When the automation credential pack supplies a dedicated account, the values
change in that file and nothing in the pipeline moves.

## Environments

One environment, and this is the defining constraint of the whole suite.

| Environment | URL | Owned by us? |
| --- | --- | --- |
| Demo | `https://demo.blu2green.earth` | No |

- **Shared, always-on, never rebuilt per run.** No ephemeral instance, no per-PR preview, no
  Docker Compose, no seeded-then-truncated database. Advice from `test-environments` that
  assumes per-PR environments does not apply and should not be adopted.
- **Single-instance and slow under concurrent load.** Workers are capped at 4 locally; a cold
  reference-data load alone can take 30 seconds, which is why timeouts are generous.
- **Real third-party integrations.** Registration pushes to NIBE and sends genuine email to
  `@businessgateways.com`, which has real MX records.
- **The database user holds `UPDATE` but not `DELETE`.** Registrations accumulate
  permanently. Cleanup is a database-side job nobody has written, not a teardown step.
- No staging or production access from this suite, so parity is not measurable here.

## Quality Goals

Chosen to match a growing team on a shared environment:

- **Critical-path E2E coverage:** all seven key user journeys above automated.
- **Flake rate:** under 2% over a rolling 30-day window, measured from Allure history.
  Anything above it is tagged `@quarantine` with a ticket, never retried into green.
- **PR feedback:** `@smoke` under 10 minutes wall-clock across 3 shards.
- **Full suite:** under 20 minutes across 3 shards. Longer than a typical target because the
  environment is shared and genuinely slow, not because the tests are wasteful.
- **Repeatability bar:** the full set must pass three consecutive runs with no manual reset
  between them. Every test added is held to this before it is considered done.
- **Quarantine hygiene:** no test sits quarantined longer than two sprints without a decision.

Unit coverage: not applicable — no application code lives here.

## Risk Areas

| Area | Risk level | Business impact | Notes |
| --- | --- | --- | --- |
| `setpassword` accepts a bare `user_id` with no proof of identity | **Critical** | Account takeover | High impact, high likelihood. `POST …/registration/setpassword` was replayed from a bare API context with no cookies or headers and was **not refused** — it answered with a business-rule message, meaning it had already agreed to act on that account. Ids are sequential. Verified 2026-08-26 against an account this suite created; not tested against any other. No test covers it; it needs the API layer. |
| Credential reset | **Critical** | Users locked out with no self-service route back | High impact. Sign-in itself is covered by `TC_LOGIN_001`/`002`, but the forgot-password flow now lives on the identity layer and has **zero** automated coverage. Highest-priority gap. |
| Business email uniqueness | **Important** | Two accounts sharing one login | Email is the sign-in identifier and is the one duplicate check that is correctly global rather than country-scoped. Making it country-scoped "for consistency" would be catastrophic and is an easy mistake to make. |
| Enterprise classification and SMEDA certificate | **Important** | Entitlement claimed without evidence | The classification decides an entitlement and is invisible on screen after submission — only readable from the database. The certificate is prompted for but **not enforced** in the form or at the server. |
| Registration for international organizations | **Important** | Silent mis-filing of foreign suppliers | A different form and a different payload, not the same request with a different dropdown. Oman coverage proves nothing about it. |
| Shared-environment data accumulation | **Monitor** | Slow degradation of the environment | Low severity, high likelihood. Every run adds registrations and two credential-history rows that nothing prunes; one account already carries 97. |
| Division backlog on the shared tenant | **Monitor** | Slower forms, then a slower suite | **Growth is stopped** — every division a test creates is removed again through the API, verified by the count falling from 127 to 125 across three full runs that create ~8 each. What remains is a backlog of **124 `auto_` divisions** left by development before teardown existed, against one real division. They load into the Add Department and Add User dropdowns, which is what `TC_DIV_CREATE_004`/`005` open, so they cost time on every run. Clearing them is a deliberate, permanent, prefix-scoped delete that nobody has authorised yet. |

## Team

- **QA engineers:** 1 — `shravan@businessgateways.com`, sole contributor to this repository.
- **Dev-to-QA ratio:** effectively solo for automation purposes.
- **Ownership model:** the QA engineer owns strategy, framework and all critical-path E2E.
  There is no manual regression suite and no second reviewer, which is why the conventions in
  `CLAUDE.md` are enforced by lint rather than by review.
- **Methodology and QA engagement point:** not formally recorded; QA currently engages after
  the application team ships a change rather than during specification.

## Conventions

Full detail in [CLAUDE.md](../CLAUDE.md). The two things downstream skills need:

- **Selector strategy:** user-facing first — `getByRole` / `getByLabel` / `getByText`, then
  `data-testid` (`testIdAttribute` is set to `data-testid`), then structural attributes.
  In practice the application ships almost no `data-testid` and its inputs frequently carry
  no accessible name, so Angular's `formcontrolname` and structural ids are common and must
  each carry a comment saying why the better options failed. Angular Material's generated
  `mat-input-N` ids are never used — they shift as the DOM changes.
- **Test data strategy:** generated per test by a factory, with a per-run stamp plus a counter
  for uniqueness — the values feed the very uniqueness rules under test, so a collision would
  read as a product bug. Long-lived fixture accounts for anything that must already exist,
  never created by a test. Fixture-account values are test data and live in `data/sign-in.json`,
  not `.env` — only genuinely per-environment settings belong there. No seeding, no
  truncation, no rollback: the database forbids `DELETE`.

## Suggested next steps

1. **Supplier-code sign-in (`TC_LOGIN_003`)** — blocked. The identity layer advertises a
   supplier-code identifier, but neither code the UI shows for the fixture account is
   accepted. Needs an answer from whoever owns the identity layer.
2. **Negative sign-in (`TC_LOGIN_004`)** — a wrong password answers *"Username and password do
   not match."* It spends an attempt allowance, so it needs its own account rather than the
   shared primary one.
3. **Credential reset** — the flow moved to the identity layer and needs exploring before any
   test is written.
4. **Registration journeys** — the largest uncovered feature area. Use `playwright-automation`.
5. **The API layer** — cover the `setpassword` finding above. Use `api-testing`.
