import type { Locator, Page } from '@playwright/test';

/**
 * The contract every page object honours: it knows its own route and how to
 * reach a usable state. Subclasses override `waitUntilReady` when "loaded" means
 * more than the document being parsed.
 *
 * Page objects hold actions and getters only — `expect()` belongs in the spec.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** The route this page lives at, relative to `baseURL`. */
  abstract readonly path: string;

  /** This method navigates to the page and waits until it is usable. */
  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitUntilReady();
  }

  /** This method waits until the page is ready. It does nothing by default. */
  async waitUntilReady(): Promise<void> {}

  /** This method returns a red error message matching the given text. */
  // Field-level and form-level messages use different markup, and which one the
  // application picks varies by message, so both are matched.
  anyError(text: string | RegExp): Locator {
    return this.page.locator('[class*="text-red"]').filter({ hasText: text });
  }

  /** This getter returns the outcome dialog. */
  // Outcomes report through a SweetAlert2 popup, not inline markup.
  get dialog(): Locator {
    return this.page.locator('.swal2-popup');
  }

  /** This getter returns the body text container of the outcome dialog. */
  get dialogBody(): Locator {
    return this.page.locator('.swal2-html-container');
  }

  /** This method confirms the outcome dialog and waits for it to close. */
  async dismissDialog(): Promise<void> {
    await this.page.locator('.swal2-confirm').click();
    await this.dialog.waitFor({ state: 'hidden' });
  }
}
