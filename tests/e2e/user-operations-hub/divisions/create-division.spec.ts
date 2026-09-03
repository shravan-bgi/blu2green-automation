import * as allure from 'allure-js-commons';
import { divisionCases } from '@config/division-cases';
import divisionData from '@data/divisions.json';
import { expect, test } from '@fixtures/test-fixtures';
import type { DivisionsPage } from '@pages/user-operations-hub/divisions/divisions.page';
import type { DivisionDropdownForm } from '@typings/division.types';
import { distinctCounts } from '@utils/counters';

test.describe('Verify an administrator should be able to add a division to the organization', () => {
  test.beforeEach(async () => {
    await allure.epic('User Operations Hub');
    await allure.feature('Divisions');
    await allure.story('Add a division');
  });

  test(
    divisionCases.TC_DIV_CREATE_001.title,
    { tag: divisionCases.TC_DIV_CREATE_001.tag },
    async ({ dashboardPage, userOperationsHubPage, division }) => {
      await allure.severity(divisionCases.TC_DIV_CREATE_001.severity);
      await allure.parameter('Division name', division.name);

      const divisionsPage =
        await test.step('Given an administrator is on the division list', async () => {
          await dashboardPage.goto();

          const hub = await dashboardPage.openUserOperationsHub();
          await expect(hub.divisionsMetric).toBeVisible();

          return hub.openDivisions();
        });

      await test.step('When a division is added with only the mandatory details', async () => {
        const form = await divisionsPage.openAddDivision();

        await form.fillDetails(division);
        await expect(form.addButton).toBeEnabled();
        await form.submit();

        await expect(divisionsPage.dialogBody).toContainText(
          `${division.name} division has been added successfully.`,
        );
        await divisionsPage.dismissDialog();
      });

      await test.step('Then it is listed with a system-generated Division ID', async () => {
        await divisionsPage.search(division.name);

        await expect(divisionsPage.divisionRow(division.name)).toBeVisible();

        // Padded on both sides in the markup, and anchored anyway: the cell
        // holds the generated ID and nothing else, which is the point.
        await expect(divisionsPage.divisionId(division.name)).toHaveText(
          /^\s*DIV-\d+-\d+\s*$/,
        );
      });

      await test.step('And its row offers Edit and Delete', async () => {
        await divisionsPage.openRowActions(division.name);

        await expect(divisionsPage.editOption).toBeVisible();
        await expect(divisionsPage.deleteOption).toBeVisible();
      });

      await test.step('And the metric card, tile, chip and table agree on how many divisions exist', async () => {
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
      });
    },
  );

  test(
    divisionCases.TC_DIV_CREATE_002.title,
    { tag: divisionCases.TC_DIV_CREATE_002.tag },
    async ({ divisionsPage, division }) => {
      await allure.severity(divisionCases.TC_DIV_CREATE_002.severity);
      await allure.parameter('Division name', division.name);
      await allure.parameter(
        'Drive file',
        `${divisionData.logo.folder}/${divisionData.logo.file}`,
      );

      const form = await test.step('Given the Add Division form is open', async () => {
        await divisionsPage.goto();

        return divisionsPage.openAddDivision();
      });

      await test.step('When the division details are filled in', async () => {
        await form.fillDetails(division);
      });

      await test.step('And a logo is attached from the b2g Drive', async () => {
        await form.attachImageFromDrive(
          divisionData.logo.folder,
          divisionData.logo.file,
        );
      });

      await test.step('And the division is added', async () => {
        await expect(form.addButton).toBeEnabled();
        await form.submit();

        await expect(divisionsPage.dialogBody).toContainText(
          `${division.name} division has been added successfully.`,
        );
        await divisionsPage.dismissDialog();
      });

      await test.step('Then it appears in the division list', async () => {
        await divisionsPage.search(division.name);

        await expect(divisionsPage.divisionRow(division.name)).toBeVisible();
      });
    },
  );

  test(
    divisionCases.TC_DIV_CREATE_003.title,
    { tag: divisionCases.TC_DIV_CREATE_003.tag },
    async ({ divisionsPage, division }) => {
      await allure.severity(divisionCases.TC_DIV_CREATE_003.severity);
      await allure.parameter(
        'Existing division name',
        divisionData.seed.duplicateProbe,
      );

      const form = await test.step('Given the Add Division form is open', async () => {
        await divisionsPage.goto();

        return divisionsPage.openAddDivision();
      });

      await test.step('When a name that already exists is submitted', async () => {
        await form.fillDetails({
          ...division,
          name: divisionData.seed.duplicateProbe,
        });
        await form.submit();
      });

      await test.step('Then the duplicate is refused', async () => {
        await expect(divisionsPage.dialog).toBeVisible();
        await expect(divisionsPage.dialogBody).toContainText(/already exist/i);
        await divisionsPage.dismissDialog();
      });

      await test.step('And no second division carries that name', async () => {
        await divisionsPage.goto();
        await divisionsPage.search(divisionData.seed.name);
        await expect(
          divisionsPage.rowsNamed(divisionData.seed.name),
        ).toHaveCount(1);
      });
    },
  );

  for (const testCase of [
    {
      ...divisionCases.TC_DIV_CREATE_004,
      form: 'Add Department',
      open: async (
        divisionsPage: DivisionsPage,
      ): Promise<DivisionDropdownForm> =>
        (await divisionsPage.openDepartments()).openAddDepartment(),
    },
    {
      ...divisionCases.TC_DIV_CREATE_005,
      form: 'Add User',
      open: async (
        divisionsPage: DivisionsPage,
      ): Promise<DivisionDropdownForm> =>
        (await divisionsPage.openUsers()).openAddUser(),
    },
  ]) {
    test(
      testCase.title,
      { tag: testCase.tag },
      async ({ divisionsPage, existingDivision }) => {
        await allure.severity(testCase.severity);
        await allure.parameter('Division name', existingDivision.name);
        await allure.parameter('Form', testCase.form);

        // The division is seeded through the service by the fixture rather than
        // driven through the form here: what these two verify is that a division
        // reaches the dropdown, not how it came to exist, and the form costs a
        // full journey the create tests above already prove.
        await test.step('Given a division exists and the division list is open', async () => {
          await divisionsPage.goto();
        });

        await test.step(`Then it is offered on the ${testCase.form} form`, async () => {
          const form = await testCase.open(divisionsPage);

          await form.openDivisionDropdown();

          await expect(
            form.divisionOptions.filter({ hasText: existingDivision.name }),
          ).toHaveCount(1);
        });
      },
    );
  }
});
