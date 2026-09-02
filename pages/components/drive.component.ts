import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * The b2g Drive picker — `app-drive` wrapping the `app-elev8drive-fe`
 * micro-frontend — used wherever the application attaches a file.
 *
 * Three things about it shape every method here:
 *
 * 1. An intro dialog stands in front of it, sometimes. The first click on the
 *    host's upload control opens a "b2g Drive" explainer rather than the picker.
 *    Whether it appears depends on account state, so nothing may assume either way.
 * 2. Closing that intro with the ✕ consumes the click. It returns to the host
 *    form with no picker open, so the upload control has to be clicked again.
 *    "Let's begin" goes straight through to the picker instead, which is why
 *    `open` uses it.
 * 3. The file input is hidden and no native chooser fires. Clicking Upload does
 *    not raise a `filechooser` event, so files are set on the input directly.
 */
export class DriveComponent {
  constructor(private readonly page: Page) {}

  /** This getter returns the picker itself. */
  // Portalled to the body, so it is never scoped to the form that opened it.
  get dialog(): Locator {
    return this.page.locator('.drivemodaldialog');
  }

  /** This getter returns the explainer that sometimes stands in front of the picker. */
  get intro(): Locator {
    return this.page.locator('.drivecloseadded');
  }

  /** This getter returns the button that leaves the explainer for the picker. */
  // The label carries a curly apostrophe and renders as "Let's begin", so the
  // name is matched loosely and case-insensitively.
  get beginButton(): Locator {
    return this.page.getByRole('button', { name: /Let.s Begin/i });
  }

  /** This getter returns the "do not show this again" checkbox on the explainer. */
  // Never tick it. Doing so suppresses the intro for the fixture account
  // permanently, and nothing rebuilds this environment to put it back — which
  // would make `introAppears()` answer differently for every later run.
  get dontShowAgainCheckbox(): Locator {
    return this.intro.getByRole('checkbox');
  }

  /** This getter returns the link that re-opens the explainer from the picker. */
  get aboutLink(): Locator {
    return this.dialog.getByText('About b2g Drive', { exact: false });
  }

  /** This getter returns the control that closes the picker. */
  get closeButton(): Locator {
    return this.page.locator('span.closethedialog').first();
  }

  /** This getter returns the Upload button inside the picker. */
  get uploadButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Upload', exact: true });
  }

  /** This getter returns the button that confirms the selection back to the host form. */
  // Disabled until a file is selected, which is a separate step from uploading one.
  get addButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Add', exact: true });
  }

  /** This getter returns the hidden file input. */
  // Hidden by design — there is no role to target and no chooser to await.
  private get fileInput(): Locator {
    return this.dialog.locator('input[type="file"]');
  }

  /** This getter returns the path shown once a folder is open. */
  // Reads "My b2g Drive>User_management".
  get breadcrumb(): Locator {
    return this.dialog.locator('.breadcrumbrow');
  }

  /** This method returns a folder in the drive, named for the module whose uploads it holds. */
  // Case matters even though the match is inexact: the folder really is
  // `User_management`, and `user_management` finds nothing.
  folder(name: string): Locator {
    return this.dialog.getByText(name, { exact: false }).first();
  }

  /** This method returns a file card inside the open folder. */
  // A fragment, not a full name: the drive truncates what it displays —
  // `division-logo.png` renders as `division-logo.p...` — so a full name never
  // matches and callers pass the stem. First of its matches, because the demo
  // drive holds two cards for the same file and either will do.
  fileCard(nameFragment: string): Locator {
    return this.dialog
      .locator('.folderisnidefile')
      .filter({ hasText: nameFragment })
      .first();
  }

  /** This method opens the picker from the host's upload control. */
  // Steps past the explainer when it turns up. The trigger is the host control,
  // for example Add Division's "Upload a file".
  //
  // The two outcomes are raced rather than timed. Giving the explainer a fixed
  // deadline and assuming it absent afterwards is wrong on a slow environment:
  // the explainer arrives late, the deadline has already passed, nothing clicks
  // "Let's begin", and the picker stays covered — which surfaces as Upload being
  // absent rather than as anything about the explainer. Waiting for whichever
  // dialog turns up first is correct however slow the load is.
  async open(trigger: Locator): Promise<void> {
    await trigger.click();

    await expect(this.beginButton.or(this.uploadButton).first()).toBeVisible({
      timeout: 60_000,
    });

    if (await this.beginButton.isVisible()) {
      await this.beginButton.click();
    }

    await expect(this.uploadButton).toBeVisible({ timeout: 60_000 });
  }

  /** This method sends a file from the local machine into the drive. */
  // This stores the file; it does not choose it. Add stays disabled until the
  // file is selected as well — uploading and selecting are separate steps here,
  // which is the thing most likely to catch a reader out. The upload is slow: the
  // picker shows "Loading data..." while it runs and rebuilds its markup when it
  // finishes, so the wait is on that text clearing rather than on any element
  // surviving the re-render.
  async uploadFromDevice(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath);
    await expect(this.dialog).not.toContainText('Loading data', {
      timeout: 120_000,
    });
  }

  /** This method opens a folder and waits for the breadcrumb to agree it is open. */
  async openFolder(name: string): Promise<void> {
    await this.folder(name).click();
    await expect(this.breadcrumb).toContainText(name, { timeout: 30_000 });
  }

  /** This method selects a file already in the open folder. */
  // The clickable target is the label beside the name, not the name itself.
  async selectFile(nameFragment: string): Promise<void> {
    await this.fileCard(nameFragment)
      .locator('label.selectionandfiletype')
      .click();
    await expect(this.addButton).toBeEnabled({ timeout: 30_000 });
  }

  /** This method picks a file already in the drive, rather than uploading another copy. */
  async selectExisting(folderName: string, nameFragment: string): Promise<void> {
    await this.openFolder(folderName);
    await this.selectFile(nameFragment);
  }

  /** This method confirms the selection back to the host form. */
  async confirm(): Promise<void> {
    await expect(this.addButton).toBeEnabled({ timeout: 45_000 });
    await this.addButton.click();
    await expect(this.dialog).toBeHidden({ timeout: 45_000 });
  }

  /** This method closes the picker without choosing anything. */
  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.dialog).toBeHidden({ timeout: 30_000 });
  }
}
