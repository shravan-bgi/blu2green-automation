import * as allure from 'allure-js-commons';
import { account } from '@config/sign-in-cases';
import { routes } from '@config/endpoints';
import { environment } from '@config/environment';
import { expect, test as setup } from '@fixtures/test-fixtures';

setup(
  'TC_SETUP_001 | Verify the suite can sign in once and save the session every browser project reuses',
  { tag: ['@setup'] },
  async ({ homePage, page }) => {
    await allure.epic('Authentication');
    await allure.feature('Session setup');

    const { identityLoginPage } = await setup.step(
      'Given the sign-in page has been opened from the home page',
      async () => {
        await homePage.goto();

        return homePage.openLogin();
      },
    );

    await setup.step('When signing in as the fixture account', async () => {
      const dashboardPage = await identityLoginPage.signIn(
        account.email,
        account.password,
      );

      // Asserted on the dashboard's own tab, not the one sign-in happened in:
      // when the identity layer routes through the NIBE hub, the application
      // opens in a further tab and `tab` stays on the hub.
      await expect(dashboardPage.tab).toHaveURL(new RegExp(`${routes.dashboard}$`));
      await expect(dashboardPage.enterpriseAdministration).toBeVisible();
    });

    await setup.step('Then the session is saved for the browser projects', async () => {
      // The context, not the tab. The session spans two origins — the identity
      // layer and the application — and saving one page's state would drop half
      // of it. The application keeps `auth_token` and `session` in localStorage
      // and sets no cookies, so storageState carries everything that matters.
      await page.context().storageState({ path: environment.storageState });
    });
  },
);
