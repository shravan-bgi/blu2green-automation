import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import { DashboardPage } from '@pages/dashboard/dashboard.page';

/**
 * The NIBE platform hub, shown after the identity layer accepts credentials.
 * Lists every platform on the account; only registered ones offer Access
 * Platform, the rest offer Register.
 */
export class PlatformHubPage extends BasePage {
  readonly path = routes.platformHub;

  /** This getter returns the signed-in account's name. */
  get accountName(): Locator {
    return this.page.getByRole('button', { name: 'Account menu' });
  }

  /** This getter returns the connected-platform count, rendered as "of N platforms". */
  get connectedPlatformCount(): Locator {
    return this.page.getByText(/of \d+ platforms/);
  }

  /** This getter returns the Access Platform button on the primary account card. */
  // Two controls read "Access Platform"; only this one has a button role, so
  // getByText matches both and fails strict mode.
  get accessPlatformButton(): Locator {
    return this.page.getByRole('button', { name: 'Access Platform' });
  }

  /** This method returns the card for one platform, by its name. */
  platformCard(name: string): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: new RegExp(`^${name}`) })
      .last();
  }

  /** This method waits until the hub has rendered the account's platforms. */
  override async waitUntilReady(): Promise<void> {
    await expect(this.page).toHaveURL(/\/demoapp\/tab\/dashboard\//, {
      timeout: 60_000,
    });
    await this.accessPlatformButton.waitFor({ timeout: 45_000 });
  }

  /** This method opens the blu2green platform and returns the dashboard and its tab. */
  // Opens in a new tab, so the dashboard belongs to a page that did not exist
  // when this was called. The tab comes back too because BasePage.page is
  // protected and specs assert on the URL.
  async accessPlatform(): Promise<{ tab: Page; dashboardPage: DashboardPage }> {
    const opened = this.page.context().waitForEvent('page');
    await this.accessPlatformButton.click();

    const tab = await opened;

    const dashboardPage = new DashboardPage(tab);
    await dashboardPage.waitUntilReady();

    return { tab, dashboardPage };
  }
}
