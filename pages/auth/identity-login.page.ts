import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import { PlatformHubPage } from '@pages/auth/platform-hub.page';

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

  /** This getter returns the Continue control that submits the credentials. */
  // A div with no role, so getByRole('button') never resolves. The arrow shares
  // the text node.
  get continueButton(): Locator {
    return this.page.getByText(/^Continue\s*→?$/);
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

  /** This method submits the sign-in form and returns the platform hub. */
  // The hub replaces the card on the same tab, so no new-page event to await.
  async submit(): Promise<PlatformHubPage> {
    await this.continueButton.click();

    const hub = new PlatformHubPage(this.page);
    await hub.waitUntilReady();

    return hub;
  }

  /** This method signs in and returns the platform hub that follows. */
  async signIn(identifier: string, password: string): Promise<PlatformHubPage> {
    await this.enterIdentifier(identifier);
    await this.enterPassword(password);

    return this.submit();
  }

  /** This method submits credentials expected to be refused. */
  // Separate from signIn, which blocks on reaching the hub — a refusal never
  // gets there.
  async signInExpectingRefusal(
    identifier: string,
    password: string,
  ): Promise<void> {
    await this.enterIdentifier(identifier);
    await this.enterPassword(password);
    await this.continueButton.click();
    await expect(this.page).toHaveURL(/\/demoapp\/login\//);
  }
}
