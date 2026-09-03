import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import { DivisionFormPage } from '@pages/user-operations-hub/divisions/division-form.page';
import { DepartmentsPage } from '@pages/user-operations-hub/departments/departments.page';
import { UsersPage } from '@pages/user-operations-hub/users/users.page';
import type { DivisionCounts } from '@typings/division.types';
import { readNumber } from '@utils/text';

/**
 * The division list, and the entry point to Add Division.
 *
 * Two of the four division counters live here — the Total Divisions tile and the
 * Total Divisions chip — alongside the table they must agree with.
 *
 * The five tiles across the top look like tabs but are links: each one navigates
 * to a route of its own rather than swapping the table in place.
 */
export class DivisionsPage extends BasePage {
  readonly path = routes.divisions;

  /** This method returns one of the tiles across the top of the list. */
  // `.usertab` rather than a role: the tiles are plain divs with no role, no
  // accessible name and no heading, so getByRole finds nothing and getByText
  // would match the summary chip below them, which repeats every label.
  tile(label: string): Locator {
    return this.page.locator('.usertab').filter({ hasText: label });
  }

  /** This getter returns the Total Divisions tile, whose caption carries the count. */
  get totalDivisionsTile(): Locator {
    return this.tile('Total Divisions');
  }

  /** This getter returns the Total Divisions summary chip beside the table. */
  // The rounded-full pill distinguishes it from the tile above, which repeats the
  // same words; neither carries a role or a test id.
  get totalDivisionsChip(): Locator {
    return this.page.locator('div.rounded-full').filter({ hasText: 'Total Divisions' });
  }

  /** This getter returns the search field above the table. */
  get searchField(): Locator {
    return this.page.getByRole('textbox', {
      name: 'Search by Division ID or Division Name',
    });
  }

  /** This getter returns the Add Division button. */
  // Inexact: the button's accessible name picks up the alt text of its icon and
  // reads "b2g Add Division".
  get addDivisionButton(): Locator {
    return this.page.getByRole('button', { name: /Add Division/ });
  }

  /** This getter returns the division table. */
  get table(): Locator {
    return this.page.getByRole('table');
  }

  /** This getter returns the table's division rows. */
  // `tr.data-row` rather than getByRole('row'): every division also renders a
  // second `tr.detail-row` holding its expandable department panel, and the role
  // does not tell the two apart.
  get rows(): Locator {
    return this.table.locator('tr.data-row');
  }

  /** This method returns the rows whose division name is exactly the one given. */
  // Exact, via the name element inside the row, rather than `hasText` on the row:
  // the row also carries the sector and the department and user counts, and a
  // substring match would let one generated name match another.
  rowsNamed(name: string): Locator {
    return this.rows.filter({ has: this.page.getByText(name, { exact: true }) });
  }

  /** This method returns the row for one division. */
  divisionRow(name: string): Locator {
    return this.rowsNamed(name).first();
  }

  /** This method returns the Division ID cell of one division's row. */
  // First cell: Division ID is the leading column, and the header is a sort
  // button rather than anything the cell itself references.
  divisionId(name: string): Locator {
    return this.divisionRow(name).getByRole('cell').first();
  }

  /** This method returns the row actions menu button for one division. */
  // The trigger is an icon button with no accessible name, so it is matched by the
  // menu-popup attribute it does carry. The system default division renders this
  // cell empty, which is what makes the button's absence assertable.
  rowActionsMenu(name: string): Locator {
    return this.divisionRow(name).locator('button[aria-haspopup="menu"]');
  }

  /** This getter returns the Edit item in an open row actions menu. */
  // Not scoped to the row: Angular Material portals the menu panel to the body.
  get editOption(): Locator {
    return this.page.getByRole('menuitem', { name: 'Edit' });
  }

  /** This getter returns the Delete item in an open row actions menu. */
  get deleteOption(): Locator {
    return this.page.getByRole('menuitem', { name: 'Delete' });
  }

  /** This getter returns the button that confirms a deletion. */
  // Labelled with the action rather than a bare Yes, so it is matched by name.
  // The confirmation and the outcome that replaces it are both the same dialog
  // element, which is why the two are told apart by their buttons.
  get confirmDeleteButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Delete', exact: true });
  }

  /** This getter returns the button that declines a deletion. */
  // Cancel, not No. The dialog carries a hidden `No` button in its markup that
  // is never shown for this confirmation, so reading the dialog's text suggests
  // three choices where only two are offered.
  get declineDeleteButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** This getter returns the button that clears an outcome dialog. */
  get acknowledgeButton(): Locator {
    return this.dialog.getByRole('button', { name: 'OK', exact: true });
  }

  /** This getter returns the paginator's range label, when the table has one. */
  // Scoped to `.custom-paginator`: the page renders the same paginator twice for
  // its responsive layouts, and an unscoped match is a strict-mode violation. The
  // two always report the same total, so this picks the application's own one
  // rather than the Tailwind-ordered copy beside it.
  //
  // Absent entirely while the list is short, which is why `rowCount` tests for it
  // rather than assuming it: once the list runs past one page, counting rows would
  // report the page size instead of the total the other three counters report.
  get paginatorRange(): Locator {
    return this.page.locator(
      'mat-paginator.custom-paginator .mat-mdc-paginator-range-label',
    );
  }

  /** This method opens one of the sibling tiles and waits for its route. */
  private async openTile(label: string): Promise<void> {
    await this.tile(label).click();
  }

  /** This method waits until the table and its counters have rendered. */
  override async waitUntilReady(): Promise<void> {
    await this.welcomeDialog.dismiss();
    await this.table.waitFor({ timeout: 60_000 });
    await this.totalDivisionsTile.waitFor({ timeout: 60_000 });
  }

  /** This method filters the table down to one division. */
  async search(term: string): Promise<void> {
    await this.searchField.fill(term);
  }

  /** This method returns how many divisions the table holds, across every page. */
  // The paginator's total is preferred when one is rendered, because counting rows
  // would return the page size rather than the total the other three counters
  // report.
  async rowCount(): Promise<number> {
    if (await this.paginatorRange.isVisible()) {
      // The number after "of" — the label reads "1 – 10 of 25", so the first
      // number in it is the start of the page, not the total.
      const match = /of\s+(\d+)/i.exec(await this.paginatorRange.innerText());

      if (match?.[1]) return Number(match[1]);
    }

    return this.rows.count();
  }

  /** This method reads the two counters on this page and the table total together. */
  // One DOM state, with no navigation in between: the environment is shared and the
  // suite is fully parallel, so a division committed by another worker between two
  // reads would make agreeing counters look like disagreeing ones.
  async readCounts(): Promise<Omit<DivisionCounts, 'metricCard'>> {
    return {
      tile: await readNumber(this.totalDivisionsTile),
      chip: await readNumber(this.totalDivisionsChip),
      rows: await this.rowCount(),
    };
  }

  /** This method opens the division form ready to add a new division. */
  async openAddDivision(): Promise<DivisionFormPage> {
    await this.addDivisionButton.click();

    const form = new DivisionFormPage(this.page);
    await form.waitUntilReady();

    return form;
  }

  /** This method opens one division's row menu and returns the form filled with its details. */
  // The same route and the same form as adding, prefilled, with Update in place
  // of Add. The row has to be found first, so callers that have searched the
  // table need not search again.
  async openEdit(name: string): Promise<DivisionFormPage> {
    await this.openRowActions(name);
    await this.editOption.click();

    const form = new DivisionFormPage(this.page);
    await form.waitUntilReady();

    return form;
  }

  /** This method opens the row actions menu for one division. */
  async openRowActions(name: string): Promise<void> {
    await this.rowActionsMenu(name).click();
    await this.editOption.waitFor({ timeout: 15_000 });
  }

  /** This method opens one division's row menu and asks to delete it. */
  // Stops at the confirmation rather than going through with it, so that a spec
  // can assert on what the confirmation says — and so the declining journey has
  // somewhere to stand.
  async openDelete(name: string): Promise<void> {
    await this.openRowActions(name);
    await this.deleteOption.click();
    await this.confirmDeleteButton.waitFor({ timeout: 30_000 });
  }

  /** This method confirms a deletion and waits for the outcome to be shown. */
  // Waits for the acknowledge button rather than for the dialog to close: the
  // outcome replaces the confirmation in the same element, so nothing closes in
  // between and only the buttons say which of the two is on screen.
  async confirmDelete(): Promise<void> {
    await this.confirmDeleteButton.click();
    await this.acknowledgeButton.waitFor({ timeout: 60_000 });
  }

  /** This method declines a deletion and waits for the confirmation to close. */
  async declineDelete(): Promise<void> {
    await this.declineDeleteButton.click();
    await expect(this.dialog).toBeHidden({ timeout: 30_000 });
  }

  /** This method opens the department list from the Departments tile. */
  async openDepartments(): Promise<DepartmentsPage> {
    await this.openTile('Departments');

    const departmentsPage = new DepartmentsPage(this.page);
    await departmentsPage.waitUntilReady();

    return departmentsPage;
  }

  /** This method opens the user list from the Total Users tile. */
  async openUsers(): Promise<UsersPage> {
    await this.openTile('Total Users');

    const usersPage = new UsersPage(this.page);
    await usersPage.waitUntilReady();

    return usersPage;
  }
}
