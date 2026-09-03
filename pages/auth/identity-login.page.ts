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

  /** This getter returns the control that leaves the NIBE hub for the application. */
  // The hub renders progressively and this button arrives after the first paint,
  // so it is only ever waited for by clicking it, never counted.
  get accessPlatformButton(): Locator {
    return this.page.getByRole('button', { name: /Access Platform/i }).first();
  }

  /** This method submits the sign-in form and returns the dashboard it ends on. */
  // Two landings are possible and this environment has served both, so neither is
  // assumed. Either the identity layer hands straight back to the application in
  // this same tab through /app/nibe-login#enc=<JWT>, or it stops at the NIBE
  // platform hub — and "Access Platform" then opens the application in a further
  // tab, which is why the dashboard returned here is not always bound to the tab
  // sign-in happened in.
  //
  // The hub and the extra tab both existed until September 2026, were removed,
  // and came back on 3 September 2026. Racing the two outcomes is what stops the
  // next reversal breaking every test again.
  async submit(): Promise<DashboardPage> {
    await this.loginButton.click();

    await this.page.waitForURL((url) => !url.toString().includes('/demoapp/login/'), {
      timeout: 90_000,
    });

    const applicationTab = this.page.url().includes('nibe.businessgateways.com')
      ? await this.leaveHub()
      : this.page;

    const dashboard = new DashboardPage(applicationTab);
    await dashboard.waitUntilReady();

    return dashboard;
  }

  /** This method leaves the NIBE hub and returns the tab the application opens in. */
  private async leaveHub(): Promise<Page> {
    const opened = this.page.context().waitForEvent('page');
    await this.accessPlatformButton.click();

    return opened;
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
