import type { Locator } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import type { DivisionDropdownForm } from '@typings/division.types';

/**
 * The Add Department form.
 *
 * The division journeys only ever read its Division dropdown: a division that
 * has just been created must be offered here, and one that has just been deleted
 * must not.
 */
export class AddDepartmentPage extends BasePage implements DivisionDropdownForm {
  readonly path = routes.addDepartment;

  /** This getter returns the Department Name field. */
  // By form control name: the input carries no label, placeholder or accessible
  // name of any kind, so no user-facing locator reaches it.
  get nameField(): Locator {
    return this.page.locator('input[formcontrolname="depname"]');
  }

  /** This getter returns the Division dropdown. */
  // By form control name for the same reason, and note the control is called
  // `division` here but `division_id` on the Add User form.
  get divisionSelect(): Locator {
    return this.page.locator('mat-select[formcontrolname="division"]');
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
