import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config/endpoints';
import { BasePage } from '@pages/base.page';
import { DriveComponent } from '@pages/components/drive.component';
import { ImageCropperComponent } from '@pages/components/image-cropper.component';
import type { Division } from '@typings/division.types';

/**
 * The Add Division form — a route of its own, not a dialog.
 *
 * Three fields are mandatory, not two: Division Name, Division (Sector) and
 * Description. Add stays disabled until all three are filled.
 */
export class AddDivisionPage extends BasePage {
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

  /** This getter returns the Add button that submits the form. */
  get addButton(): Locator {
    return this.page.getByRole('button', { name: 'Add', exact: true });
  }

  /** This getter returns the Cancel button. */
  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: 'Cancel', exact: true });
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
    await this.addButton.waitFor({ timeout: 45_000 });
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

  /** This method submits the form and waits for the outcome dialog. */
  async submit(): Promise<void> {
    await this.addButton.click();
    await this.dialog.waitFor({ timeout: 60_000 });
  }

  /** This method abandons the form without saving. */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
