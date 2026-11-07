import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

// Runs in the `webkit-touch` project only: an iPhone, touch and no hover (NFR-4).
test.describe('touch (FR-10, NFR-4)', () => {
  test('FR-10: one tap on a key adds its symbol once (#23)', async ({ page }) => {
    await page.goto('/');
    const word = page.getByRole('textbox', { name: 'Word' });
    const key = page.getByRole('button', { name: /^ʃ\s?,/ });

    await key.tap();
    await expect(word).toHaveText('/ʃ/');
    await key.tap();
    await expect(word).toHaveText('/ʃʃ/');
    // The tap scrolled the key into view, leaving the output's Copy buttons half
    // under the sticky word strip, which axe's target-size rule counts. Scan
    // from the top, as the layout specs do.
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await expectNoA11yViolations(page);
  });

  test('FR-10: hover alone reveals nothing on a key, so iOS never spends a tap on it (#23)', async ({
    page,
  }) => {
    // iOS Safari turns the first tap into a hover whenever :hover would make
    // something visible. The test browser doesn't do that, so check the cause:
    // with focus gone, the hover a tap leaves behind must not show the speaker.
    await page.goto('/');
    const key = page.getByRole('button', { name: /^ʃ\s?,/ });
    await key.tap();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    const speaker = page.locator('[title="Listen to ʃ"]');
    await expect(speaker).toHaveCSS('opacity', '0');
    await expect(page.getByRole('tooltip')).toBeHidden();
  });
});
