import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';

/**
 * The blu2green dashboard, where a successful sign-in ends.
 *
 * Reached through an SSO handoff: the identity layer returns the browser to
 * `/app/nibe-login#enc=<token>`, which redirects here. Assert on this route,
 * never the handoff URL.
 */
export class DashboardPage extends BasePage {
  readonly path = routes.dashboard;

  /** This getter returns the b2g home link in the dashboard header. */
  // Scoped to the banner: three links are named "b2g" — the header brand and two
  // footer logos taking the name from their img alt.
  get brandLink(): Locator {
    return this.page
      .getByRole('banner')
      .getByRole('link', { name: 'b2g', exact: true });
  }

  /** This getter returns the Enterprise Administration section heading. */
  get enterpriseAdministration(): Locator {
    return this.page.getByText('Enterprise Administration');
  }

  /** This getter returns the User Operations Hub tile. */
  get userOperationsHubLink(): Locator {
    return this.page.getByRole('link', { name: /User Operations Hub/ });
  }

  /** This getter returns the welcome dialog heading. */
  // Located by the heading, not the container: `.welcome-dialog-container`
  // measures 1200x0, so toBeVisible() fails on it while the dialog is on screen.
  get welcomeHeading(): Locator {
    return this.page.getByText('Welcome to b2g Framework', { exact: false });
  }

  /** This getter returns the close button on the welcome dialog. */
  private get welcomeCloseButton(): Locator {
    return this.page
      .locator('.welcome-dialog-container')
      .getByRole('button', { name: '✕' });
  }

  /** This method closes the welcome dialog if it appears, and does nothing if it does not. */
  // Dismissing it does not persist — `um_wlcmintro` is unchanged — so it can
  // return on any arrival and cannot be cleared once in setup.
  async dismissWelcomeDialog(timeout = 5_000): Promise<boolean> {
    try {
      await this.welcomeHeading.waitFor({ state: 'visible', timeout });
    } catch {
      return false;
    }

    await this.welcomeCloseButton.click();
    await expect(this.welcomeHeading).toBeHidden({ timeout: 15_000 });

    return true;
  }

  /** This method waits until the dashboard has loaded and nothing is covering it. */
  override async waitUntilReady(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${routes.dashboard}$`), {
      timeout: 60_000,
    });
    await this.dismissWelcomeDialog();
  }
}
