import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import { DriveComponent } from '@pages/components/drive.component';
import { ImageCropperComponent } from '@pages/components/image-cropper.component';
import type { Division } from '@typings/division.types';

/**
 * The division form — a route of its own, not a dialog, and the same route
 * whether a division is being added or edited.
 *
 * Adding and editing differ only in the button that commits: `Add` on the way
 * in, `Update` when a row's Edit opened it with the fields already filled. That
 * is why one class serves both.
 *
 * Three fields are mandatory, not two: Division Name, Division (Sector) and
 * Description. The commit button stays disabled until all three are filled, and
 * on an edit until something has actually changed.
 */
export class DivisionFormPage extends BasePage {
  readonly path = routes.addDivision;

  /** This getter returns the b2g Drive picker behind the image upload control. */
  get drive(): DriveComponent {
    return new DriveComponent(this.page);
  }

  /** This getter returns the cropper that opens once an image has been chosen. */
  get imageCropper(): ImageCropperComponent {
    return new ImageCropperComponent(this.page);
  }

  /** This getter returns the Division Name field. */
  get nameField(): Locator {
    return this.page.getByRole('textbox', { name: 'Division Name' });
  }

  /** This getter returns the Division (Sector) dropdown. */
  // By form control name: the select carries no accessible name, and its only id
  // is Angular Material's generated `mat-select-N`, which shifts as the DOM does.
  get sectorSelect(): Locator {
    return this.page.locator('mat-select[formcontrolname="division_sector"]');
  }

  /** This method returns one option in an open dropdown. */
  // Options are portalled to the body, so they are never scoped to the select.
  option(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  /** This getter returns every option in the open dropdown. */
  get options(): Locator {
    return this.page.getByRole('option');
  }

  /** This getter returns the Description rich-text editor. */
  // A CKEditor `contenteditable`, not an input. It reports role="textbox" and
  // carries the editor's own aria-label, so it is still reachable by role.
  get descriptionEditor(): Locator {
    return this.page.getByRole('textbox', { name: /Editor editing area/ });
  }

  /** This getter returns the control that opens the b2g Drive picker. */
  get uploadFileControl(): Locator {
    return this.page.getByText('Upload a file', { exact: true });
  }

  /** This getter returns the Add button, which commits a new division. */
  get addButton(): Locator {
    return this.page.getByRole('button', { name: 'Add', exact: true });
  }

  /** This getter returns the Update button, which commits an edit. */
  get updateButton(): Locator {
    return this.page.getByRole('button', { name: 'Update', exact: true });
  }

  /** This getter returns whichever button commits this form. */
  // Only one of the two is ever rendered, so `or` resolves without ambiguity and
  // one submit path serves adding and editing alike.
  get submitButton(): Locator {
    return this.addButton.or(this.updateButton);
  }

  /** This getter returns the Cancel button. */
  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** This getter returns the warning Cancel raises when the form has been changed. */
  // Matched by its own wording rather than by role alone: this journey passes
  // through several unnamed dialogs, and the outcome dialog is one of them.
  get unsavedChangesWarning(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ hasText: 'Any unsaved changes will be lost' });
  }

  /** This getter returns the button that confirms the changes may be discarded. */
  get discardChangesButton(): Locator {
    return this.unsavedChangesWarning.getByRole('button', { name: 'Yes', exact: true });
  }

  /** This method waits until the whole form is mounted and will keep what is typed. */
  // Waiting for the name field alone is not enough, and the way it fails is
  // silent: the field renders first, accepts a value, and is then reset to
  // pristine when the component finishes building the rest of the form. The typed
  // name is simply gone, Add stays disabled, and nothing on screen says why. The
  // editor and the Add button are the last two things to mount, so waiting for
  // them is what makes the form's own contract — "input given to me is kept" — true.
  override async waitUntilReady(): Promise<void> {
    await this.nameField.waitFor({ timeout: 45_000 });
    await this.descriptionEditor.waitFor({ timeout: 45_000 });
    await this.submitButton.waitFor({ timeout: 45_000 });
  }

  /** This method enters the division name. */
  async enterName(name: string): Promise<void> {
    await this.nameField.fill(name);
  }

  /** This method picks a sector from the mandatory Division (Sector) dropdown. */
  async selectSector(sector: string): Promise<void> {
    await this.sectorSelect.click();

    // Wait for the panel to open, not just for the one option. When the click
    // lands before the select is wired up it does nothing at all, and waiting
    // straight on the option spends the whole test timeout without ever saying
    // that the dropdown never opened.
    await expect(this.options.first()).toBeVisible({ timeout: 45_000 });

    await this.option(sector).click();
    await expect(this.option(sector)).toBeHidden({ timeout: 15_000 });
  }

  /** This method enters the description. */
  // `fill` works on the editor's contenteditable and replaces its contents, which
  // is what the edit journeys need as well as the create ones.
  async enterDescription(description: string): Promise<void> {
    await this.descriptionEditor.fill(description);
  }

  /** This method fills every mandatory field on the form. */
  async fillDetails(division: Division): Promise<void> {
    await this.enterName(division.name);
    await this.selectSector(division.sector);
    await this.enterDescription(division.description);
  }

  /** This method attaches an image already held in the b2g Drive. */
  // Selects rather than uploads: the demo drive already holds the logo, and
  // uploading another copy on every run would grow a store nothing prunes.
  async attachImageFromDrive(folder: string, file: string): Promise<void> {
    await this.drive.open(this.uploadFileControl);
    await this.drive.selectExisting(folder, file);
    await this.drive.confirm();

    // The picker closing is not the end of it: a cropper opens in its place, and
    // the form stays behind that modal until the image is accepted.
    await this.imageCropper.accept();
  }

  /** This method commits the form and waits for the outcome dialog. */
  async submit(): Promise<void> {
    await this.submitButton.click();
    await this.dialog.waitFor({ timeout: 60_000 });
  }

  /** This method clears the division name, leaving a mandatory field empty. */
  async clearName(): Promise<void> {
    await this.nameField.fill('');
  }

  /** This method abandons a changed form, confirming that the changes are discarded. */
  // Cancel does not leave straight away once something has been typed: it raises
  // an "Are you sure?" warning, and answering it is part of cancelling. A form
  // that has not been touched leaves without asking, so this is the path for one
  // that has.
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.discardChangesButton.click();
    await expect(this.unsavedChangesWarning).toBeHidden({ timeout: 30_000 });
  }
}
