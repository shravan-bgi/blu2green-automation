import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * The "Welcome to b2g Framework" dialog, which opens over whatever the
 * application has just rendered.
 *
 * Every page that can be arrived at handles it, which is why it lives here
 * rather than on the dashboard: the User Operations Hub journeys arrive at four
 * different routes and none of them wants to construct a DashboardPage just to
 * get the dialog out of the way.
 */
export class WelcomeDialogComponent {
  constructor(private readonly page: Page) {}

  /** This getter returns the welcome dialog heading. */
  // Located by the heading, not the container: `.welcome-dialog-container`
  // measures 1200x0, so toBeVisible() fails on it while the dialog is on screen.
  get heading(): Locator {
    return this.page.getByText('Welcome to b2g Framework', { exact: false });
  }

  /** This getter returns the close button on the welcome dialog. */
  private get closeButton(): Locator {
    return this.page
      .locator('.welcome-dialog-container')
      .getByRole('button', { name: '✕' });
  }

  /** This method closes the dialog if it appears, and does nothing if it does not. */
  // Whether it appears is decided by `showWelcomePopup` in sessionStorage, which
  // a fresh browser context never carries — so a saved storageState does not
  // suppress it and it cannot be cleared once during setup.
  async dismiss(timeout = 5_000): Promise<boolean> {
    try {
      await this.heading.waitFor({ state: 'visible', timeout });
    } catch {
      return false;
    }

    await this.closeButton.click();
    await expect(this.heading).toBeHidden({ timeout: 15_000 });

    return true;
  }
}
