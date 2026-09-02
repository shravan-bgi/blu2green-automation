import { faker } from '@faker-js/faker';
import divisionData from '@data/divisions.json';
import { workerSlot } from '@config/environment';
import type { Division } from '@typings/division.types';

/** Marks every division this suite creates, so accumulated rows stay identifiable. */
// Nothing deletes these — the database user holds no DELETE — so a future
// housekeeping job needs one predicate that cannot match a real division.
export const TEST_DIVISION_PREFIX = 'auto_';

/**
 * A per-run base, the worker slot and a counter. Anything feeding a uniqueness
 * rule is built from this rather than from randomness, so a parallel worker
 * cannot collide and make a product rule look broken.
 */
// The worker slot is not decoration. Each worker is a separate process with its
// own copy of this module, so two started in the same millisecond would share a
// run stamp and both emit sequence 01 — and a colliding division name is exactly
// what TC_DIV_CREATE_003 asserts the application refuses, so the collision would
// surface as a duplicate-name modal inside a positive test.
const RUN_STAMP = `${Date.now().toString().slice(-6)}${workerSlot()}`;
let sequence = 0;

/** This function returns a value unique to this call across every worker in the run. */
function uniqueSuffix(): string {
  sequence += 1;

  return `${RUN_STAMP}${sequence.toString().padStart(2, '0')}`;
}

/** This function strips the punctuation Faker emits and the form may refuse. */
// The registration form has already proved that an ampersand leaves a field
// silently invalid with Submit disabled and nothing on screen saying why.
function lettersAndSpaces(value: string): string {
  return value
    .replace(/[^A-Za-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** This function builds one division, unique to this call. */
// Faker names it and the suffix makes it unique. The sector and description are
// static: both are mandatory, neither varies the behaviour under test, and a
// generated description would only add noise to a diff between two runs.
export function buildDivision(): Division {
  const { sector, description } = divisionData.defaults;

  return {
    name: `${TEST_DIVISION_PREFIX}${lettersAndSpaces(faker.commerce.department())} ${uniqueSuffix()}`,
    sector,
    description,
  };
}
