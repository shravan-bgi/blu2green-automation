import type { Severity } from 'allure-js-commons';

/**
 * One fixture account and every identifier that reaches it. The identity layer
 * accepts any of them against one password.
 */
export type AuthAccount = {
  email: string;
  mobile: string;
  password: string;
};

/** Which of the account's identifiers a sign-in case uses. */
// Derived from AuthAccount, so a key that does not exist fails to compile.
export type IdentifierKey = keyof Omit<AuthAccount, 'password'>;

/** One row of the sign-in case table in data/sign-in.json. */
// No `id` field: the key it is stored under is the test ID.
export type SignInCase = {
  title: string;
  label: string;
  identifierKey: IdentifierKey;
  tag: string[];
  severity: Severity;
};
