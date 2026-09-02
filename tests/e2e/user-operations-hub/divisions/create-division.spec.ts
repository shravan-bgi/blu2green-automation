import * as allure from 'allure-js-commons';
import divisionData from '@data/divisions.json';
import { expect, test } from '@fixtures/test-fixtures';
import type { DivisionsPage } from '@pages/user-operations-hub/divisions/divisions.page';
import type { DivisionDropdownForm } from '@typings/division.types';
import { distinctCounts } from '@utils/counters';

const { logo, seed } = divisionData;

test.describe('Verify an administrator should be able to add a division to the organization', () => {
  test.beforeEach(async () => {
    await allure.epic('User Operations Hub');
    await allure.feature('Divisions');
    await allure.story('Add a division');
  });

  test(
    'TC_DIV_CREATE_001 | Verify an administrator can add a new division with only the mandatory details and see it listed with a system-generated division ID',
    { tag: ['@smoke', '@user-operations-hub', '@positive', '@ui'] },
    async ({ dashboardPage, userOperationsHubPage, division }) => {
      await allure.severity(allure.Severity.BLOCKER);
      await allure.parameter('Division name', division.name);

      const divisionsPage = await test.step(
        'Open the division list from the dashboard',
        async () => {
          await dashboardPage.goto();

          const hub = await dashboardPage.openUserOperationsHub();
          await expect(hub.divisionsMetric).toBeVisible();

          return hub.openDivisions();
        },
      );

      await test.step('Add a division with only the mandatory details', async () => {
        const form = await divisionsPage.openAddDivision();

        await form.fillDetails(division);
        await expect(form.addButton).toBeEnabled();
        await form.submit();

        await expect(divisionsPage.dialogBody).toContainText(
          `${division.name} division has been added successfully.`,
        );
        await divisionsPage.dismissDialog();
      });

      await test.step(
        'Check the division is listed with a system-generated ID',
        async () => {
          await divisionsPage.search(division.name);

          await expect(divisionsPage.divisionRow(division.name)).toBeVisible();

          // Padded on both sides in the markup, and anchored anyway: the cell
          // holds the generated ID and nothing else, which is the point.
          await expect(divisionsPage.divisionId(division.name)).toHaveText(
            /^\s*DIV-\d+-\d+\s*$/,
          );
        },
      );

      await test.step('Check the row offers Edit and Delete', async () => {
        await divisionsPage.openRowActions(division.name);

        await expect(divisionsPage.editOption).toBeVisible();
        await expect(divisionsPage.deleteOption).toBeVisible();
      });

      await test.step(
        'Check the metric card, the tile, the chip and the table agree on how many divisions exist',
        async () => {
          // No expected number anywhere: the environment is shared and the suite
          // is fully parallel, so any "+1" would be racing every other worker.
          // Agreement between the four counters is the property that has to hold
          // whatever else is happening, and it is what a drifting counter breaks.
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
    'TC_DIV_CREATE_002 | Verify an administrator can add a new division with an image chosen from the b2g Drive',
    { tag: ['@regression', '@user-operations-hub', '@positive', '@ui'] },
    async ({ divisionsPage, division }) => {
      await allure.severity(allure.Severity.CRITICAL);
      await allure.parameter('Division name', division.name);
      await allure.parameter('Drive file', `${logo.folder}/${logo.file}`);

      const form = await test.step('Open the Add Division form', async () => {
        await divisionsPage.goto();

        return divisionsPage.openAddDivision();
      });

      await test.step('Fill the division details', async () => {
        await form.fillDetails(division);
      });

      await test.step(
        'Attach the division logo from the b2g Drive',
        async () => {
          // Selected, not uploaded: the file is already in the drive, and the
          // picker treats storing a file and choosing one as separate steps.
          await form.attachImageFromDrive(logo.folder, logo.file);
        },
      );

      await test.step('Add the division', async () => {
        await expect(form.addButton).toBeEnabled();
        await form.submit();

        await expect(divisionsPage.dialogBody).toContainText(
          `${division.name} division has been added successfully.`,
        );
        await divisionsPage.dismissDialog();
      });

      await test.step('Check the division is listed', async () => {
        await divisionsPage.search(division.name);

        await expect(divisionsPage.divisionRow(division.name)).toBeVisible();
      });
    },
  );

  test(
    'TC_DIV_CREATE_003 | Verify a division that repeats the name of an existing division is refused and is not added to the division list',
    { tag: ['@regression', '@user-operations-hub', '@negative', '@ui'] },
    async ({ divisionsPage, division }) => {
      await allure.severity(allure.Severity.CRITICAL);
      await allure.parameter('Existing division name', seed.duplicateProbe);

      const form = await test.step('Open the Add Division form', async () => {
        await divisionsPage.goto();

        return divisionsPage.openAddDivision();
      });

      await test.step(
        'Submit the name of a division that already exists',
        async () => {
          // Lower case on purpose: this pins the duplicate check as
          // case-insensitive as well as present.
          await form.fillDetails({ ...division, name: seed.duplicateProbe });
          await form.submit();
        },
      );

      await test.step('Check the duplicate is refused', async () => {
        await expect(divisionsPage.dialog).toBeVisible();
        await expect(divisionsPage.dialogBody).toContainText(/already exist/i);
        await divisionsPage.dismissDialog();
      });

      await test.step(
        'Check no second division carries that name',
        async () => {
          await divisionsPage.goto();
          await divisionsPage.search(seed.name);

          // An exact count rather than a delta: this proves nothing else by that
          // name appeared, and it cannot be raced by another worker, whose
          // divisions are all uniquely named.
          await expect(divisionsPage.rowsNamed(seed.name)).toHaveCount(1);
        },
      );
    },
  );

  // Add Department and Add User ask the identical question of a new division, so
  // they share one body. The opener is per case because the two forms sit behind
  // different tiles; everything after it is the same, which is exactly what
  // `DivisionDropdownForm` names.
  const dropdownCases = [
    {
      title:
        'TC_DIV_CREATE_004 | Verify a newly added division is offered in the Division list when a new department is created',
      form: 'Add Department',
      open: async (divisionsPage: DivisionsPage): Promise<DivisionDropdownForm> =>
        (await divisionsPage.openDepartments()).openAddDepartment(),
    },
    {
      title:
        'TC_DIV_CREATE_005 | Verify a newly added division is offered in the Division list when a new user is created',
      form: 'Add User',
      open: async (divisionsPage: DivisionsPage): Promise<DivisionDropdownForm> =>
        (await divisionsPage.openUsers()).openAddUser(),
    },
  ] as const;

  for (const testCase of dropdownCases) {
    test(
      testCase.title,
      { tag: ['@regression', '@user-operations-hub', '@positive', '@ui'] },
      async ({ divisionsPage, division }) => {
        await allure.severity(allure.Severity.NORMAL);
        await allure.parameter('Division name', division.name);
        await allure.parameter('Form', testCase.form);

        await test.step('Add a division', async () => {
          await divisionsPage.goto();
          await divisionsPage.createDivision(division);
        });

        await test.step(
          `Check the division is offered on the ${testCase.form} form`,
          async () => {
            const form = await testCase.open(divisionsPage);

            await form.openDivisionDropdown();

            await expect(
              form.divisionOptions.filter({ hasText: division.name }),
            ).toHaveCount(1);
          },
        );
      },
    );
  }
});
