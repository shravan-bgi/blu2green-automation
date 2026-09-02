import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import { DashboardPage } from '@pages/dashboard/dashboard.page';

/**
 * The b2g Identity Layer sign-in card, on a different origin from the
 * application. The identifier accepts an email, mobile number or supplier code;
 * there is no PIN mode.
 */
export class IdentityLoginPage extends BasePage {
  readonly path = routes.identityLogin;

  /** This getter returns the identifier field. */
  get identifier(): Locator {
    return this.page.getByRole('textbox', {
      name: 'Enter your email ID, supplier',
    });
  }

  /** This getter returns the password field. */
  get password(): Locator {
    return this.page.getByRole('textbox', { name: 'Enter your password' });
  }

  /** This getter returns the Login control that submits the credentials. */
  // A div with no role, so getByRole('button') never resolves. The arrow shares
  // the text node. Named "Continue" until September 2026, so match the word
  // loosely enough to survive the next rename but tightly enough to stay unique.
  get loginButton(): Locator {
    return this.page.getByText(/^(Login|Continue)\s*→?$/);
  }

  /** This getter returns the Forgot password link. */
  // Also a div, not a link.
  get forgotPasswordLink(): Locator {
    return this.page.getByText('Forgot password?', { exact: true });
  }

  /** This getter returns the "Keep me signed in on this device" toggle. */
  get keepSignedInToggle(): Locator {
    return this.page.getByText('Keep me signed in on this device');
  }

  /** This method refuses to navigate, because this page cannot be reached directly. */
  // The login URL returns 404 on direct navigation; it renders only when opened
  // from the home page.
  override async goto(): Promise<never> {
    throw new Error(
      'The b2g Identity Layer cannot be navigated to directly — the URL returns 404. ' +
        'Reach it with HomePage.openLogin().',
    );
  }

  /** This method waits until the sign-in card is ready to accept input. */
  override async waitUntilReady(): Promise<void> {
    await this.identifier.waitFor({ timeout: 45_000 });
  }

  /** This method enters the identifier into the identifier field. */
  async enterIdentifier(identifier: string): Promise<void> {
    await this.identifier.fill(identifier);
  }

  /** This method enters the password into the password field. */
  async enterPassword(password: string): Promise<void> {
    await this.password.fill(password);
  }

  /** This method submits the sign-in form and returns the dashboard it lands on. */
  // The identity layer hands back to the application in this same tab, via
  // /app/nibe-login#enc=<JWT>, which then redirects. No new tab and no platform
  // hub in between — both existed until September 2026 and were removed.
  async submit(): Promise<DashboardPage> {
    await this.loginButton.click();

    const dashboard = new DashboardPage(this.page);
    await dashboard.waitUntilReady();

    return dashboard;
  }

  /** This method signs in and returns the dashboard that follows. */
  async signIn(identifier: string, password: string): Promise<DashboardPage> {
    await this.enterIdentifier(identifier);
    await this.enterPassword(password);

    return this.submit();
  }

  /** This method submits credentials expected to be refused. */
  // Separate from signIn, which blocks on reaching the dashboard — a refusal
  // never gets there.
  async signInExpectingRefusal(
    identifier: string,
    password: string,
  ): Promise<void> {
    await this.enterIdentifier(identifier);
    await this.enterPassword(password);
    await this.loginButton.click();
    await expect(this.page).toHaveURL(/\/demoapp\/login\//);
  }

  /** This getter returns the page this card is bound to, for URL assertions. */
  // BasePage keeps `page` protected; sign-in arrives on a tab the spec did not
  // open, so it needs a handle to assert the origin.
  get tab(): Page {
    return this.page;
  }
}
