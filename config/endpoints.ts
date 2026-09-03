/**
 * Application routes, relative to `baseURL`. A page object reads its own route
 * from here rather than hard-coding one.
 */
export const routes = {
  home: '/home',
  dashboard: '/app/dashboard/commondashboard',

  /** The User Operations Hub landing page, with the division and user metrics. */
  userOperationsHub: '/app/usermanagement/landingpage',

  /** The division list. */
  divisions: '/app/usermanagement/divisions',

  /** The Add Division form, which is a route of its own rather than a dialog. */
  addDivision: '/app/usermanagement/adddivision',

  /** The department list, reached from the Departments tile on any hub list page. */
  departments: '/app/usermanagement/department_list',

  /** The Add Department form. */
  addDepartment: '/app/usermanagement/adddepartment',

  /** The user list. */
  // The trailing segment is a base64 parameter — `Uw==`, percent-encoded. It does
  // deep-link, but the Total Users tile is the honest way in; this is here so that
  // no page object hard-codes a route of its own.
  users: '/app/usermanagement/management/Uw%3D%3D',

  /** The Add User form. */
  addUser: '/app/usermanagement/addusers',

  /** The b2g Identity Layer sign-in page. */
  // Absolute and on another host: authentication lives outside the application,
  // so `baseURL` does not cover it.
  identityLogin: 'https://nibe.businessgateways.com/demoapp/login/b2g',
} as const;

/**
 * Only the endpoints the suite waits on, stubs or asserts against — not an
 * inventory of the API.
 */
export const endpoints = {} as const;

/**
 * The user-management service, which every User Operations Hub screen talks to.
 *
 * Kept apart from {@link endpoints} because these are called directly rather
 * than waited on: the suite uses them to seed a precondition and to take back
 * what a test created.
 */
// Captured from the application on 2026-09-03 by watching what the division
// screens send, rather than taken from documentation — there is none.
export const userOperationsHubApi = {
  base: '/usermg/web/apium/um',

  addDivision: 'adddivision',
  divisionListing: 'divisionlisting',

  /** Named for a deactivation, but the removal is permanent. */
  deactivateDivision: 'deactivatedivision',

  sectorList: 'getsectorlist',
} as const;
