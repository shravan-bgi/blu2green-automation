import type { Locator, Page } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import { IdentityLoginPage } from '@pages/auth/identity-login.page';

/** The public home page, and the entry point to both Register and Login. */
export class HomePage extends BasePage {
  readonly path = routes.home;

  /** This getter returns the Login link in the header. */
  get loginLink(): Locator {
    return this.page.getByRole('link', { name: 'Login', exact: true });
  }

  /** This getter returns the Register link in the header. */
  // Exact: an inexact match also hits "Join the b2g Network".
  get registerLink(): Locator {
    return this.page.getByRole('link', { name: 'Register', exact: true }).first();
  }

  /** This method waits until the header links are available. */
  override async waitUntilReady(): Promise<void> {
    await this.loginLink.waitFor({ timeout: 45_000 });
  }

  /** This method opens the sign-in page and returns it with the tab it arrived in. */
  // target="_blank" and a different origin, so the caller ends up on a second tab
  // against the identity layer and needs both back.
  async openLogin(): Promise<{ tab: Page; identityLoginPage: IdentityLoginPage }> {
    const opened = this.page.context().waitForEvent('page');
    await this.loginLink.click();

    const tab = await opened;

    const identityLoginPage = new IdentityLoginPage(tab);
    await identityLoginPage.waitUntilReady();

    return { tab, identityLoginPage };
  }
}
