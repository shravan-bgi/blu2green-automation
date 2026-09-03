import * as allure from 'allure-js-commons';
import { divisionCases } from '@config/division-cases';
import divisionData from '@data/divisions.json';
import { expect, test } from '@fixtures/test-fixtures';
import { distinctCounts } from '@utils/counters';

test.describe('Verify an administrator should be able to delete a division', () => {
  test.beforeEach(async () => {
    await allure.epic('User Operations Hub');
    await allure.feature('Divisions');
    await allure.story('Delete a division');
  });

  test(
    divisionCases.TC_DIV_DELETE_001.title,
    { tag: divisionCases.TC_DIV_DELETE_001.tag },
    async ({ divisionsPage, userOperationsHubPage, userOperationsHubApi, existingDivision }) => {
      await allure.severity(divisionCases.TC_DIV_DELETE_001.severity);
      await allure.parameter('Division name', existingDivision.name);

      await test.step('Ask to delete the division', async () => {
        await divisionsPage.goto();
        await divisionsPage.search(existingDivision.name);

        await expect(divisionsPage.divisionRow(existingDivision.name)).toBeVisible();

        await divisionsPage.openDelete(existingDivision.name);
      });

      await test.step('Check the confirmation says what it will do', async () => {
        await expect(divisionsPage.dialogBody).toContainText(existingDivision.name);
        await expect(divisionsPage.dialogBody).toContainText(/permanently delete/i);
      });

      await test.step('Confirm the deletion', async () => {
        await divisionsPage.confirmDelete();

        await expect(divisionsPage.dialogBody).toContainText(/has been deleted/i);
        await divisionsPage.dismissDialog();
      });

      await test.step('Check the division is gone from the list', async () => {
        await divisionsPage.search(existingDivision.name);

        await expect(divisionsPage.rowsNamed(existingDivision.name)).toHaveCount(0);
        expect(await userOperationsHubApi.countDivisionsNamed(existingDivision.name)).toBe(0);
      });

      await test.step(
        'Check the metric card, the tile, the chip and the table still agree',
        async () => {
          // Agreement rather than "one fewer": the environment is shared and the
          // suite is fully parallel, so a delta would be racing every other
          // worker. What has to hold after a delete is that the four counters
          // moved together.
          await expect
            .poll(
              async () =>
                distinctCounts(await userOperationsHubPage.readDivisionCounts()),
              {
                message:
                  'The Divisions metric card, the Total Divisions tile, the summary chip and the table should all report the same number of divisions',
                timeout: 120_000,
                intervals: [1_000, 3_000, 5_000],
              },
            )
            .toHaveLength(1);
        },
      );
    },
  );

  test(
    divisionCases.TC_DIV_DELETE_002.title,
    { tag: divisionCases.TC_DIV_DELETE_002.tag },
    async ({ divisionsPage, userOperationsHubApi, existingDivision }) => {
      await allure.severity(divisionCases.TC_DIV_DELETE_002.severity);
      await allure.parameter('Division name', existingDivision.name);

      await test.step('Ask to delete the division, then cancel', async () => {
        await divisionsPage.goto();
        await divisionsPage.search(existingDivision.name);

        await divisionsPage.openDelete(existingDivision.name);
        await expect(divisionsPage.dialogBody).toContainText(/permanently delete/i);

        await divisionsPage.declineDelete();
      });

      await test.step('Check the division is still there', async () => {
        // Searched again rather than read where it was left: declining reloads
        // the listing, which drops the filter, and the table pages at ten rows
        // against a tenant holding well over a hundred divisions — so the row is
        // still there but nowhere near the first page.
        await divisionsPage.search(existingDivision.name);

        await expect(divisionsPage.divisionRow(existingDivision.name)).toBeVisible();

        // Read through the service as well as the table: a row still on screen
        // could be a stale render, and this is the assertion that would matter
        // most if it were ever wrong.
        expect(await userOperationsHubApi.countDivisionsNamed(existingDivision.name)).toBe(1);
      });
    },
  );

  test(
    divisionCases.TC_DIV_DELETE_003.title,
    { tag: divisionCases.TC_DIV_DELETE_003.tag },
    async ({ divisionsPage, userOperationsHubApi }) => {
      await allure.severity(divisionCases.TC_DIV_DELETE_003.severity);
      await allure.parameter('Division name', divisionData.seed.name);

      await test.step(
        'Check the system-default division offers no row actions at all',
        async () => {
          await divisionsPage.goto();
          await divisionsPage.search(divisionData.seed.name);

          await expect(divisionsPage.divisionRow(divisionData.seed.name)).toBeVisible();

          // One menu holds both Edit and Delete, and this division renders the
          // Action cell empty, so there is nothing to open rather than a Delete
          // that is present but refused.
          await expect(
            divisionsPage.rowActionsMenu(divisionData.seed.name),
          ).toHaveCount(0);
        },
      );

      await test.step('Check the division is still on the tenant', async () => {
        expect(await userOperationsHubApi.countDivisionsNamed(divisionData.seed.name)).toBe(1);
      });
    },
  );

  test(
    divisionCases.TC_DIV_DELETE_004.title,
    { tag: divisionCases.TC_DIV_DELETE_004.tag },
    async ({ divisionsPage, userOperationsHubApi, existingDivision }) => {
      await allure.severity(divisionCases.TC_DIV_DELETE_004.severity);
      await allure.parameter('Division name', existingDivision.name);

      await test.step('Delete the division', async () => {
        // Removed through the service rather than the form: what this verifies
        // is that a deleted division stops being offered, not how it came to be
        // deleted — TC_DIV_DELETE_001 covers that, and doing it again here would
        // cost a second full journey.
        expect(
          await userOperationsHubApi.deleteDivisionNamed(existingDivision.name),
        ).toBe(true);
      });

      await test.step(
        'Check it is no longer offered on the Add Department form',
        async () => {
          await divisionsPage.goto();

          const departmentsPage = await divisionsPage.openDepartments();
          const form = await departmentsPage.openAddDepartment();

          await form.openDivisionDropdown();

          await expect(
            form.divisionOptions.filter({ hasText: existingDivision.name }),
          ).toHaveCount(0);
        },
      );

      await test.step('Check it is no longer offered on the Add User form', async () => {
        await divisionsPage.goto();

        const usersPage = await divisionsPage.openUsers();
        const form = await usersPage.openAddUser();

        await form.openDivisionDropdown();

        await expect(
          form.divisionOptions.filter({ hasText: existingDivision.name }),
        ).toHaveCount(0);
      });
    },
  );
});
