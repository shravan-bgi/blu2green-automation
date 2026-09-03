import * as allure from 'allure-js-commons';
import { divisionCases } from '@config/division-cases';
import divisionData from '@data/divisions.json';
import { expect, test } from '@fixtures/test-fixtures';

test.describe('Verify an administrator should be able to edit an existing division', () => {
  test.beforeEach(async () => {
    await allure.epic('User Operations Hub');
    await allure.feature('Divisions');
    await allure.story('Edit a division');
  });

  test(
    divisionCases.TC_DIV_EDIT_001.title,
    { tag: divisionCases.TC_DIV_EDIT_001.tag },
    async ({ divisionsPage, userOperationsHubApi, existingDivision }) => {
      await allure.severity(divisionCases.TC_DIV_EDIT_001.severity);
      await allure.parameter('Division name', existingDivision.name);

      const renamed = `${existingDivision.name} renamed`;

      await test.step('Open the division for editing', async () => {
        await divisionsPage.goto();
        await divisionsPage.search(existingDivision.name);

        await expect(
          divisionsPage.divisionRow(existingDivision.name),
        ).toBeVisible();
      });

      await test.step('Change the name and update', async () => {
        const form = await divisionsPage.openEdit(existingDivision.name);

        // The form arrives filled in, which is what makes Update meaningful:
        // it commits a change to these values rather than a fresh record.
        await expect(form.nameField).toHaveValue(existingDivision.name);
        await expect(form.updateButton).toBeDisabled();

        await form.enterName(renamed);
        await expect(form.updateButton).toBeEnabled();
        await form.submit();

        await expect(divisionsPage.dialogBody).toContainText(
          /updated successfully/i,
        );
        await divisionsPage.dismissDialog();
      });

      await test.step('Check the table shows the new name', async () => {
        await divisionsPage.search(renamed);

        await expect(divisionsPage.divisionRow(renamed)).toBeVisible();
      });

      await test.step('Check the existing record was updated rather than a second one added', async () => {
        // Read through the service rather than the table: an exact-name count
        // is the precise reading of "no new record", and the table can only
        // show what its current filter left behind.
        expect(await userOperationsHubApi.countDivisionsNamed(renamed)).toBe(1);
        expect(
          await userOperationsHubApi.countDivisionsNamed(existingDivision.name),
        ).toBe(0);
      });
    },
  );

  test(
    divisionCases.TC_DIV_EDIT_002.title,
    { tag: divisionCases.TC_DIV_EDIT_002.tag },
    async ({ divisionsPage, userOperationsHubApi, existingDivision }) => {
      await allure.severity(divisionCases.TC_DIV_EDIT_002.severity);
      await allure.parameter('Division name', existingDivision.name);

      await test.step('Change the name but cancel instead of updating', async () => {
        await divisionsPage.goto();
        await divisionsPage.search(existingDivision.name);

        const form = await divisionsPage.openEdit(existingDivision.name);

        await form.enterName(`${existingDivision.name} abandoned`);
        await form.cancel();
      });

      await test.step('Check the division is unchanged', async () => {
        await expect(divisionsPage.searchField).toBeVisible();
        await divisionsPage.search(existingDivision.name);

        await expect(
          divisionsPage.divisionRow(existingDivision.name),
        ).toBeVisible();

        expect(
          await userOperationsHubApi.countDivisionsNamed(existingDivision.name),
        ).toBe(1);
        expect(
          await userOperationsHubApi.countDivisionsNamed(
            `${existingDivision.name} abandoned`,
          ),
        ).toBe(0);
      });
    },
  );

  test(
    divisionCases.TC_DIV_EDIT_003.title,
    { tag: divisionCases.TC_DIV_EDIT_003.tag },
    async ({ divisionsPage, existingDivision }) => {
      await allure.severity(divisionCases.TC_DIV_EDIT_003.severity);
      await allure.parameter('Division name', existingDivision.name);

      await test.step('Open the division for editing and change nothing', async () => {
        await divisionsPage.goto();
        await divisionsPage.search(existingDivision.name);

        const form = await divisionsPage.openEdit(existingDivision.name);

        await expect(form.nameField).toHaveValue(existingDivision.name);
        await expect(form.updateButton).toBeDisabled();
      });
    },
  );

  test(
    divisionCases.TC_DIV_EDIT_004.title,
    { tag: divisionCases.TC_DIV_EDIT_004.tag },
    async ({ divisionsPage, existingDivision }) => {
      await allure.severity(divisionCases.TC_DIV_EDIT_004.severity);
      await allure.parameter('Division name', existingDivision.name);

      await test.step('Clear the mandatory division name', async () => {
        await divisionsPage.goto();
        await divisionsPage.search(existingDivision.name);

        const form = await divisionsPage.openEdit(existingDivision.name);

        await form.enterName(`${existingDivision.name} v2`);
        await expect(form.updateButton).toBeEnabled();

        await form.clearName();
        await expect(form.updateButton).toBeDisabled();
      });
    },
  );

  test(
    divisionCases.TC_DIV_EDIT_005.title,
    { tag: divisionCases.TC_DIV_EDIT_005.tag },
    async ({ divisionsPage }) => {
      await allure.severity(divisionCases.TC_DIV_EDIT_005.severity);
      await allure.parameter('Division name', divisionData.seed.name);

      await test.step('Check the system-default division offers no row actions at all', async () => {
        await divisionsPage.goto();
        await divisionsPage.search(divisionData.seed.name);

        await expect(
          divisionsPage.divisionRow(divisionData.seed.name),
        ).toBeVisible();

        await expect(
          divisionsPage.rowActionsMenu(divisionData.seed.name),
        ).toHaveCount(0);
      });
    },
  );
});
