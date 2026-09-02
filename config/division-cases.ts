import divisionData from '@data/divisions.json';
import type { DivisionCase } from '@typings/division.types';

/** The division case table from data/divisions.json, keyed by test ID. */
// A JSON import widens strings, so `severity` arrives having lost its enum.
// Asserted once here, as the sign-in table is in sign-in-cases.ts.
export const divisionCases = divisionData.cases as Record<
  keyof typeof divisionData.cases,
  DivisionCase
>;
