import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

const html = (page: Page) => page.locator('html');

test.describe('settings (FR-40 – FR-42, Q-2, Q-3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
  });

  test('FR-42: settings apply at once and survive a reload', async ({ page }) => {
    const opener = page.getByRole('button', { name: 'Settings' });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();
    await expectNoA11yViolations(page);

    await dialog.getByRole('radio', { name: 'Light' }).check();
    await dialog.getByRole('radio', { name: 'Hard' }).check();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await expect(html(page)).toHaveAttribute('data-contrast', 'hard');
    await expectNoA11yViolations(page);

    await dialog.getByRole('radio', { name: /^r \(broad/ }).check();
    const macro = dialog.getByRole('textbox', { name: 'LaTeX macro name' });
    await macro.fill('pron');
    await expect(dialog.getByText('\\newcommand{\\pron}[1]{\\textipa{/#1/}}')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();

    await expect(page.getByRole('button', { name: /^r\s?, voiced alveolar/ })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Copy \\pron\{…\} macro call$/ }),
    ).toBeAttached();

    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await expect(html(page)).toHaveAttribute('data-contrast', 'hard');
    await expect(
      page.getByRole('button', { name: /^Copy \\pron\{…\} macro call$/ }),
    ).toBeAttached();
  });

  test('SPEC §7.2, M6.5: tie bars redraw affricates everywhere, and are remembered', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /^tʃ\s?, voiceless postalveolar affricate/ }).click();
    const outputs = page.getByRole('region', { name: 'Word' }).locator('output');
    await expect(outputs.last()).toHaveText('tS');

    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('checkbox', { name: /^Write with a tie bar/ }).check();
    await expectNoA11yViolations(page);
    await page.keyboard.press('Escape');

    await expect(outputs.first()).toHaveText('/t\u0361ʃ/');
    await expect(outputs.last()).toHaveText('\\t{tS}');
    const key = page.getByRole('button', {
      name: /^t\u0361ʃ\s?, voiceless postalveolar affricate/,
    });
    await expect(key).toBeVisible();
    // The word itself doesn't change: the URL still names the affricate.
    await expect(page).toHaveURL(/#w=1:tesh$/);

    await page.reload();
    await expect(outputs.last()).toHaveText('\\t{tS}');
  });

  test('FR-40: "Match system" follows the system again after an override', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('radio', { name: 'Light' }).check();
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await dialog.getByRole('radio', { name: 'Match system' }).check();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
  });

  test('an invalid macro name is flagged and not used', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    const macro = page.getByRole('textbox', { name: 'LaTeX macro name' });
    await macro.fill('ipa2');
    await expect(macro).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Use letters only (a–z, A–Z). Still using \\ipa.')).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('on a phone, Settings leads to the keyboard shortcuts', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await expect(page.getByRole('button', { name: 'Keyboard shortcuts' })).toBeHidden();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
