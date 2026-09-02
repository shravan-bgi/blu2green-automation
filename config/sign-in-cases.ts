import signInData from '@data/sign-in.json';
import type { AuthAccount, SignInCase } from '@typings/auth.types';

/** The fixture account the sign-in journeys use. */
export const account = signInData.account satisfies AuthAccount;

/** The sign-in case table from data/sign-in.json, keyed by test ID. */
// A JSON import widens strings, so `identifierKey` arrives as `string` and
// `severity` loses its enum. Asserted once here.
export const signInCases = signInData.cases as Record<
  keyof typeof signInData.cases,
  SignInCase
>;
