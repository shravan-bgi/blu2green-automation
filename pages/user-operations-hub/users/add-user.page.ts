import type { Locator } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import type { DivisionDropdownForm } from '@typings/division.types';

/**
 * The Add User form.
 *
 * The division journeys only ever read its Division dropdown: a division that
 * has just been created must be offered here, and one that has just been deleted
 * must not.
 */
export class AddUserPage extends BasePage implements DivisionDropdownForm {
  readonly path = routes.addUser;

  /** This getter returns the Division dropdown. */
  // By form control name: the form carries seven `mat-select` controls and none of
  // them has an accessible name, so neither getByRole nor getByLabel can tell
  // them apart. The control is `division_id` here but plain `division` on the Add
  // Department form.
  get divisionSelect(): Locator {
    return this.page.locator('mat-select[formcontrolname="division_id"]');
  }

  /** This getter returns the options in the open Division dropdown. */
  // Portalled to the body, so never scoped to the select.
  get divisionOptions(): Locator {
    return this.page.getByRole('option');
  }

  /** This method waits until the form is ready to accept input. */
  override async waitUntilReady(): Promise<void> {
    await this.divisionSelect.waitFor({ timeout: 45_000 });
  }

  /** This method opens the Division dropdown and waits for its options. */
  async openDivisionDropdown(): Promise<void> {
    await this.divisionSelect.click();
    await this.divisionOptions.first().waitFor({ timeout: 30_000 });
  }
}
