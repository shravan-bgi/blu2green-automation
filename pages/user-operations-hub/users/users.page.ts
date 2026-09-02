import type { Locator } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import { AddUserPage } from '@pages/user-operations-hub/users/add-user.page';

/** The user list, reached from the Total Users tile on the division list. */
export class UsersPage extends BasePage {
  readonly path = routes.users;

  /** This getter returns the Add User button. */
  get addUserButton(): Locator {
    return this.page.getByRole('button', { name: /Add User/ });
  }

  /** This method waits until the list is ready. */
  override async waitUntilReady(): Promise<void> {
    await this.welcomeDialog.dismiss();
    await this.addUserButton.waitFor({ timeout: 60_000 });
  }

  /** This method opens the Add User form. */
  async openAddUser(): Promise<AddUserPage> {
    await this.addUserButton.click();

    const addUserPage = new AddUserPage(this.page);
    await addUserPage.waitUntilReady();

    return addUserPage;
  }
}
