import type { Locator } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import { DivisionsPage } from '@pages/user-operations-hub/divisions/divisions.page';
import type { DivisionCounts } from '@typings/division.types';
import { readNumber } from '@utils/text';

/**
 * The User Operations Hub landing page: four metric cards over the module's
 * divisions, departments, users and pledges.
 *
 * The Divisions metric card is one of the four counters the division journeys
 * hold the application to, and it is the only one that does not live on the
 * division list itself.
 */
export class UserOperationsHubPage extends BasePage {
  readonly path = routes.userOperationsHub;

  /** This getter returns the caption under the Divisions metric card. */
  // The caption, not the card: the card element carries only layout classes and
  // nothing that names it, whereas this text is exact and unique on the page.
  get divisionsMetricLabel(): Locator {
    return this.page.getByText('Divisions', { exact: true });
  }

  /** This getter returns the number on the Divisions metric card. */
  // Reached from the caption outward. The count is the caption's immediately
  // preceding sibling heading; getByRole('heading') alone matches all four cards,
  // and none of them carries an accessible name to tell them apart.
  get divisionsMetric(): Locator {
    return this.divisionsMetricLabel.locator('xpath=preceding-sibling::h5[1]');
  }

  /** This getter returns the Divisions metric card, which opens the division list. */
  // The card is not a link — it navigates on a JS click — so the caption's parent
  // is the clickable target rather than an href.
  get divisionsCard(): Locator {
    return this.divisionsMetricLabel.locator('xpath=ancestor::div[@class][1]');
  }

  /** This method waits until the metric cards have rendered their numbers. */
  // The page shells in before the counts arrive, and a cold reference-data load
  // can take 30 seconds, so waiting on the route alone reads an empty heading.
  override async waitUntilReady(): Promise<void> {
    await this.welcomeDialog.dismiss();
    await this.divisionsMetric.waitFor({ timeout: 60_000 });
  }

  /** This method opens the division list from the Divisions metric card. */
  async openDivisions(): Promise<DivisionsPage> {
    await this.divisionsCard.click();

    const divisionsPage = new DivisionsPage(this.page);
    await divisionsPage.waitUntilReady();

    return divisionsPage;
  }

  /** This method reads all four division counters in one pass through the hub. */
  // The metric card and the table sit on different routes, so the four numbers
  // cannot come from one DOM. They are read in navigation order — landing page,
  // then the list it opens — so a pass costs one hop rather than two round trips.
  // Callers poll this whole method rather than asserting on a single reading: the
  // environment is shared and the suite is fully parallel, so another worker can
  // commit a division between the two reads. That disagreement clears on the next
  // pass, while a real one never does. Re-navigating also drops any search filter
  // an earlier step left on the table, which would otherwise make the row count
  // disagree with the counters by design.
  async readDivisionCounts(): Promise<DivisionCounts> {
    await this.goto();

    const metricCard = await readNumber(this.divisionsMetric);
    const divisionsPage = await this.openDivisions();

    return { metricCard, ...(await divisionsPage.readCounts()) };
  }
}
