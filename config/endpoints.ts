/**
 * Application routes, relative to `baseURL`. A page object reads its own route
 * from here rather than hard-coding one.
 */
export const routes = {
  home: '/home',
  dashboard: '/app/dashboard/commondashboard',

  /** The b2g Identity Layer sign-in page, and the platform hub behind it. */
  // Absolute and on another host: authentication lives outside the application,
  // so `baseURL` does not cover these two.
  identityLogin: 'https://nibe.businessgateways.com/demoapp/login/b2g',
  platformHub: 'https://nibe.businessgateways.com/demoapp/tab/dashboard/b2g',
} as const;

/**
 * Only the endpoints the suite waits on, stubs or asserts against — not an
 * inventory of the API.
 */
export const endpoints = {} as const;
