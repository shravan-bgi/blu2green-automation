import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import { UserOperationsHubPage } from '@pages/user-operations-hub/user-operations-hub.page';

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

  /** This getter returns the tab this dashboard is bound to, for URL assertions. */
  // BasePage keeps `page` protected, and sign-in no longer ends in the tab it
  // started in: when the identity layer routes through the NIBE hub, the
  // application opens in a further tab, and this is the only handle on it.
  get tab(): Page {
    return this.page;
  }

  /** This getter returns the User Operations Hub tile. */
  get userOperationsHubLink(): Locator {
    return this.page.getByRole('link', { name: /User Operations Hub/ });
  }

  /** This method opens the User Operations Hub and returns its landing page. */
  async openUserOperationsHub(): Promise<UserOperationsHubPage> {
    await this.userOperationsHubLink.click();

    const hub = new UserOperationsHubPage(this.page);
    await hub.waitUntilReady();

    return hub;
  }

  /** This method waits until the dashboard has loaded and nothing is covering it. */
  override async waitUntilReady(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${routes.dashboard}$`), {
      timeout: 60_000,
    });
    await this.welcomeDialog.dismiss();
  }
}
