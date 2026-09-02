import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * The image cropper the application opens after an image is chosen from the b2g
 * Drive.
 *
 * It sits between the picker and the host form, and it is easy to miss: the
 * Drive dialog closes on Add as though the attachment were finished, and this
 * opens in its place. Until it is accepted the host form is behind a modal, so
 * every control on it reads as absent rather than disabled.
 */
export class ImageCropperComponent {
  constructor(private readonly page: Page) {}

  /** This getter returns the cropper dialog. */
  // Filtered by its instruction text: the application renders several dialogs
  // with no accessible name, so the role alone is not unique across a journey.
  get dialog(): Locator {
    return this.page
      .getByRole('dialog')
      .filter({ hasText: 'Click and drag image to select an area' });
  }

  /** This getter returns the Crop button that accepts the selection. */
  get cropButton(): Locator {
    return this.dialog.getByRole('button', { name: 'Crop', exact: true });
  }

  /** This getter returns the image the cropper is working on. */
  get sourceImage(): Locator {
    return this.dialog.locator('img.source-image');
  }

  /** This method accepts the image as-is and waits for the host form to return. */
  // The wait on the image is the whole reason this method exists. The dialog and
  // an enabled Crop button are both there the instant it opens, but the image
  // element measures 0x0 until its data arrives, and Crop against a
  // zero-sized image does nothing at all — no error, no close, just a dialog that
  // sits there until the test times out. Visibility is the right condition
  // because Playwright does not count a zero-area element as visible.
  //
  // No dragging: once the image has loaded the cropper defaults to selecting all
  // of it, and this suite is testing that a logo can be attached, not the
  // cropper's geometry.
  async accept(): Promise<void> {
    await expect(this.sourceImage).toBeVisible({ timeout: 60_000 });
    await this.cropButton.click();
    await expect(this.dialog).toBeHidden({ timeout: 45_000 });
  }
}
