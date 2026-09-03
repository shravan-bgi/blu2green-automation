import * as allure from 'allure-js-commons';
import { divisionCases } from '@config/division-cases';
import { expect, test } from '@fixtures/test-fixtures';

test.describe('Verify an administrator should be able to find a division in the list', () => {
  test.beforeEach(async () => {
    await allure.epic('User Operations Hub');
    await allure.feature('Divisions');
    await allure.story('Find a division');
  });

  // Every test here searches for a division the fixture created and only this
  // test owns. That is what makes them safe while three other workers are
  // adding and removing divisions in the same company — a search for anything
  // shared would be counting other people's rows.

  test(
    divisionCases.TC_DIVSEARCH_001.title,
    { tag: divisionCases.TC_DIVSEARCH_001.tag },
    async ({ divisionsPage, existingDivision }) => {
      await allure.severity(divisionCases.TC_DIVSEARCH_001.severity);
      await allure.parameter('Division name', existingDivision.name);

      await test.step('When the division is searched for by name', async () => {
        await divisionsPage.goto();
        await divisionsPage.search(existingDivision.name);
      });

      await test.step('Then it is the only division shown', async () => {
        await expect(divisionsPage.divisionRow(existingDivision.name)).toBeVisible();
        await expect(divisionsPage.rows).toHaveCount(1);
      });
    },
  );

  test(
    divisionCases.TC_DIVSEARCH_002.title,
    { tag: divisionCases.TC_DIVSEARCH_002.tag },
    async ({ divisionsPage, userOperationsHubApi, existingDivision }) => {
      await allure.severity(divisionCases.TC_DIVSEARCH_002.severity);

      const divisionId = await test.step('Given the division has a system-generated Division ID', async () => {
        const record = await userOperationsHubApi.findDivision(existingDivision.name);

        expect(record, 'the seeded division could not be read back').toBeDefined();

        return record?.mcsd_referenceno ?? '';
      });

      await allure.parameter('Division ID', divisionId);

      await test.step('When that ID is searched for', async () => {
        await divisionsPage.goto();
        await divisionsPage.search(divisionId);
      });

      await test.step('Then the division is found', async () => {
        // The row, not an exact row count. Division IDs are supposed to be
        // unique and are not — TC_DIVAPI_004 reproduces a generation race that
        // puts one ID on two divisions — so counting here would fail for a
        // defect this test is not about.
        await expect(divisionsPage.divisionRow(existingDivision.name)).toBeVisible();
      });
    },
  );

  test(
    divisionCases.TC_DIVSEARCH_003.title,
    { tag: divisionCases.TC_DIVSEARCH_003.tag },
    async ({ divisionsPage, existingDivision }) => {
      await allure.severity(divisionCases.TC_DIVSEARCH_003.severity);
      await allure.parameter('Division name', existingDivision.name);

      await test.step('Given an administrator has paged into the middle of the list', async () => {
        await divisionsPage.goto();

        await expect(divisionsPage.nextPageButton).toBeEnabled();
        await divisionsPage.nextPageButton.click();

        await expect(divisionsPage.paginatorRange).not.toContainText(/^\s*1\s*[–-]/);

        // Page two has to have finished arriving before anything is typed: a
        // reload landing mid-search empties the box and quietly returns the
        // whole list.
        await expect(divisionsPage.rows.first()).toBeVisible();
      });

      await test.step('When a division is searched for from there', async () => {
        await divisionsPage.search(existingDivision.name);
      });

      await test.step(
        'Then the matches are shown rather than the page that was open',
        async () => {
          // The defect this guards against is a search that filters the data but
          // leaves the paginator on page two, so an administrator sees an empty
          // table and concludes the division does not exist.
          await expect(divisionsPage.divisionRow(existingDivision.name)).toBeVisible();
          await expect(divisionsPage.rows).toHaveCount(1);
        },
      );
    },
  );

  test(
    divisionCases.TC_DIVSEARCH_004.title,
    { tag: divisionCases.TC_DIVSEARCH_004.tag },
    async ({ divisionsPage, existingDivision }) => {
      await allure.severity(divisionCases.TC_DIVSEARCH_004.severity);

      const total = await test.step('Given an administrator is on the full division list', async () => {
        await divisionsPage.goto();

        return divisionsPage.rowCount();
      });

      await allure.parameter('Divisions before searching', String(total));

      await test.step('When the list is narrowed to one division', async () => {
        await divisionsPage.search(existingDivision.name);

        await expect(divisionsPage.rows).toHaveCount(1);
      });

      await test.step('Then clearing the search brings the whole list back', async () => {
        await divisionsPage.clearSearch();

        await expect(divisionsPage.searchField).toHaveValue('');

        // Polled, not read once. Clearing reloads the listing, and a plain
        // `expect(await rowCount())` reads whatever the table holds at that
        // instant — which mid-reload is nothing at all.
        //
        // Compared against what the list held a moment ago rather than a fixed
        // number: three other workers are adding and removing divisions in this
        // same company, so the only safe statement is that the list is no longer
        // narrowed to one.
        await expect
          .poll(() => divisionsPage.rowCount(), {
            message: 'clearing the search did not bring the full division list back',
            timeout: 30_000,
          })
          .toBeGreaterThan(1);
      });
    },
  );

  test(
    divisionCases.TC_DIVSEARCH_005.title,
    { tag: divisionCases.TC_DIVSEARCH_005.tag },
    async ({ divisionsPage }) => {
      await allure.severity(divisionCases.TC_DIVSEARCH_005.severity);

      const noSuchDivision = 'zzz-no-division-is-called-this-zzz';
      await allure.parameter('Search term', noSuchDivision);

      await test.step('When a term that cannot match anything is searched for', async () => {
        await divisionsPage.goto();
        await divisionsPage.search(noSuchDivision);
      });

      await test.step('Then the list says so rather than showing stale rows', async () => {
        // A table that keeps its previous rows after a search that matched
        // nothing is the dangerous failure: it reads as a result.
        await expect(divisionsPage.emptyState).toBeVisible();
        await expect(divisionsPage.rows).toHaveCount(0);
      });
    },
  );
});
