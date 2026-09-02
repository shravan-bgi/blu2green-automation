import authData from '@data/auth.json';
import type { AuthAccount, IdentifierCase } from '@typings/auth.types';

/** The fixture account the sign-in journeys use. */
export const account = authData.account satisfies AuthAccount;

/** The sign-in identifier table from data/auth.json, typed. */
// A JSON import widens strings, so `identifierKey` arrives as `string` and
// `severity` loses its enum. Asserted once here.
export const identifierCases = authData.identifierCases as readonly IdentifierCase[];
