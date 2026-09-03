import * as allure from 'allure-js-commons';
import { account, signInCases } from '@config/sign-in-cases';
import { routes } from '@config/endpoints';
import { expect, test } from '@fixtures/test-fixtures';

test.describe('Verify a registered user should be able to sign in', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async () => {
    await allure.epic('Authentication');
    await allure.feature('Sign in');
  });

  for (const testCase of Object.values(signInCases)) {
    test(testCase.title, { tag: testCase.tag }, async ({ homePage }) => {
      await allure.severity(testCase.severity);
      await allure.parameter('Identifier type', testCase.label);

      const identifier = account[testCase.identifierKey];

      const { identityLoginPage } =
        await test.step('Given the sign-in page has been opened from the home page', async () => {
          await homePage.goto();
          await expect(homePage.loginLink).toBeVisible();

          const opened = await homePage.openLogin();
          await expect(opened.tab).toHaveURL(/nibe\.businessgateways\.com/);

          return opened;
        });

      const dashboardPage =
        await test.step(`When signing in with a valid ${testCase.label} and password`, async () => {
          await expect(identityLoginPage.identifier).toBeVisible();
          await expect(identityLoginPage.password).toBeVisible();

          return identityLoginPage.signIn(identifier, account.password);
        });

      await test.step('Then the blu2green dashboard is displayed', async () => {
        // The dashboard's own tab, which is not always the one sign-in happened
        // in: the identity layer either hands back in place through
        // /app/nibe-login#enc=<JWT>, or routes through the NIBE platform hub and
        // opens the application in a further tab.
        await expect(dashboardPage.tab).toHaveURL(new RegExp(`${routes.dashboard}$`));
        await expect(dashboardPage.enterpriseAdministration).toBeVisible();
        await expect(dashboardPage.userOperationsHubLink).toBeVisible();
      });
    });
  }
});
