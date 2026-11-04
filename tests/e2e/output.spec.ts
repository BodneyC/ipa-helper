import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { copiedTexts, recordClipboard } from './clipboard';

const build = async (page: Page, glyphs: readonly string[]) => {
  const palette = page.getByRole('region', { name: 'Symbols' });
  for (const glyph of glyphs) {
    await palette.getByRole('button', { name: new RegExp(`^${glyph}\\s?,`) }).click();
  }
};

test.describe('output panel (FR-20 – FR-23)', () => {
  test.beforeEach(async ({ page }) => {
    await recordClipboard(page);
    await page.goto('/');
  });

  test('FR-20/FR-21: shows IPA and TIPA for /ˈθɔːnɪk/', async ({ page }) => {
    await build(page, ['ˈ', 'θ', 'ɔː', 'n', 'ɪ', 'k']);
    const word = page.getByRole('region', { name: 'Word' });
    await expect(word.locator('output').first()).toHaveText('/ˈθɔːnɪk/');
    await expect(word.locator('output').last()).toHaveText('"TO:nIk');
    await expectNoA11yViolations(page);
  });

  test('FR-20/FR-21/FR-23: copy actions write the right text and announce it', async ({ page }) => {
    await build(page, ['t', 'ɹ', 'æ', 'p']);
    await page.getByRole('button', { name: 'Copy IPA' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Copied IPA' })).toBeAttached();
    await expect(page.getByRole('button', { name: 'Copied, Copy IPA' })).toHaveText('Copied');
    await page.getByRole('button', { name: 'Copy TIPA' }).click();
    await page.getByRole('button', { name: 'Copy \\ipa{…} macro call' }).click();
    await page.getByRole('checkbox', { name: 'Copy with slashes' }).uncheck();
    await page.getByRole('button', { name: /Copy IPA$/ }).click();
    expect(await copiedTexts(page)).toEqual([
      '/tɹæp/',
      't\\textturnr{}\\ae{}p',
      '\\ipa{t\\textturnr{}\\ae{}p}',
      'tɹæp',
    ]);
    await expectNoA11yViolations(page);
  });

  test('FR-22: two primary stresses stay apart in TIPA', async ({ page }) => {
    await build(page, ['ˈ', 'ˈ']);
    await expect(page.getByRole('region', { name: 'Word' }).locator('output').last()).toHaveText(
      '"{}"',
    );
  });

  test('copy buttons are disabled while the word is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Copy IPA' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Copy TIPA' })).toBeDisabled();
  });
});
