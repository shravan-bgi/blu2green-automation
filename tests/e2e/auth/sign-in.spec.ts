import * as allure from 'allure-js-commons';
import { account, identifierCases } from '@config/auth-cases';
import { routes } from '@config/endpoints';
import { expect, test } from '@fixtures/test-fixtures';

test.describe('Verify a registered user should be able to sign in', () => {
  test.beforeEach(async () => {
    await allure.epic('Authentication');
    await allure.feature('Sign in');
  });

  for (const testCase of identifierCases) {
    test(
      `${testCase.id} | Verify a registered user can sign in with a valid ${testCase.label} and password and reach the blu2green dashboard`,
      { tag: [...testCase.tag] },
      async ({ homePage }) => {
        await allure.severity(testCase.severity);
        await allure.parameter('Identifier type', testCase.label);

        const identifier = account[testCase.identifierKey];

        const { tab, identityLoginPage } =
          await test.step('Open the sign-in page from the home page', async () => {
            await homePage.goto();
            await expect(homePage.loginLink).toBeVisible();

            const opened = await homePage.openLogin();

            // Sign-in is on another origin, not in the application.
            await expect(opened.tab).toHaveURL(/nibe\.businessgateways\.com/);

            return opened;
          });

        const hub =
          await test.step(`Sign in with a valid ${testCase.label} and password`, async () => {
            await expect(identityLoginPage.identifier).toBeVisible();
            await expect(identityLoginPage.password).toBeVisible();

            return identityLoginPage.signIn(identifier, account.password);
          });

        await test.step('Check the platform hub lists an accessible platform', async () => {
          await expect(tab).toHaveURL(/\/demoapp\/tab\/dashboard\//);
          await expect(hub.accountName).toBeVisible();
          await expect(hub.accessPlatformButton).toBeEnabled();
        });

        const { tab: dashboardTab, dashboardPage } =
          await test.step('Enter the blu2green platform', async () =>
            hub.accessPlatform());

        await test.step('Check the dashboard is displayed', async () => {
          // Asserted on the third tab, not the sign-in tab: the hub stays open.
          await expect(dashboardTab).toHaveURL(
            new RegExp(`${routes.dashboard}$`),
          );

          // Content as well as URL: the SSO handoff redirects through
          // /app/nibe-login, so a URL check alone can pass mid-render.
          await expect(dashboardPage.enterpriseAdministration).toBeVisible();
          await expect(dashboardPage.userOperationsHubLink).toBeVisible();
        });
      },
    );
  }
});
