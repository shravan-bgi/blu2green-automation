import type { Locator } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import { AddDepartmentPage } from '@pages/user-operations-hub/departments/add-department.page';

/** The department list, reached from the Departments tile on the division list. */
export class DepartmentsPage extends BasePage {
  readonly path = routes.departments;

  /** This getter returns the Add Department button. */
  get addDepartmentButton(): Locator {
    return this.page.getByRole('button', { name: /Add Department/ });
  }

  /** This method waits until the list is ready. */
  override async waitUntilReady(): Promise<void> {
    await this.welcomeDialog.dismiss();
    await this.addDepartmentButton.waitFor({ timeout: 60_000 });
  }

  /** This method opens the Add Department form. */
  async openAddDepartment(): Promise<AddDepartmentPage> {
    await this.addDepartmentButton.click();

    const addDepartmentPage = new AddDepartmentPage(this.page);
    await addDepartmentPage.waitUntilReady();

    return addDepartmentPage;
  }
}
