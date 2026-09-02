import type { Locator } from '@playwright/test';

/** This function returns the first whole number found in a locator's text. */
// The counters never render a bare number: the tile reads "Total Divisions01",
// the chip reads "Total Divisions 01" and the metric card reads "01Divisions".
// Values are zero-padded, so Number() rather than parseInt-on-a-slice.
export async function readNumber(locator: Locator): Promise<number> {
  const text = (await locator.innerText()).replace(/\s+/g, ' ');
  const match = /(\d[\d,]*)/.exec(text);

  if (!match?.[1]) {
    throw new Error(`Expected a number somewhere in "${text}", and found none.`);
  }

  return Number(match[1].replace(/,/g, ''));
}
