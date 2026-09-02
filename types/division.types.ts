import type { Locator } from '@playwright/test';
import type { Severity } from 'allure-js-commons';

/** One row of the division case table in data/divisions.json. */
// No `id` field: the key it is stored under is the test ID.
export type DivisionCase = {
  title: string;
  tag: string[];
  severity: Severity;
};

/**
 * What a form carrying a Division dropdown offers the division journeys.
 *
 * Add Department and Add User are unrelated pages with different form control
 * names, but every division test that reaches them asks the same two questions —
 * open the dropdown, then look at what it offers. Naming that shape lets one
 * test body cover both, and lets the delete journeys reuse it to assert absence.
 */
export type DivisionDropdownForm = {
  divisionOptions: Locator;
  openDivisionDropdown(): Promise<void>;
};

/** The details the Add Division form needs to create one division. */
export type Division = {
  name: string;
  /** One of the 21 sector options the mandatory Division (Sector) dropdown offers. */
  sector: string;
  description: string;
};

/**
 * The four numbers that must agree about how many divisions exist: the metric
 * card on the hub landing page, the Total Divisions tile, the summary chip
 * beside the table, and the table itself.
 */
export type DivisionCounts = {
  metricCard: number;
  tile: number;
  chip: number;
  rows: number;
};
