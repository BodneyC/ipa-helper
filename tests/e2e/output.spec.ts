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
    await expect(word.locator('output').nth(1)).toHaveText('"TO:nIk');
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
    await expect(page.getByRole('region', { name: 'Word' }).locator('output').nth(1)).toHaveText(
      '"{}"',
    );
  });

  test('copy buttons are disabled while the word is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Copy IPA' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Copy TIPA' })).toBeDisabled();
  });

  test('FR-25 – FR-29: the More row writes the word in another format, and copies it', async ({
    page,
  }) => {
    await build(page, ['ˈ', 'θ', 'ɔː', 'n', 'ɪ', 'k']);
    const outputs = page.getByRole('region', { name: 'Word' }).locator('output');
    const format = page.getByRole('combobox', { name: 'Format' });
    await expect(format).toHaveValue('xsampa');
    await expect(outputs.nth(2)).toHaveText('"TO:nIk');

    await format.selectOption({ label: 'Kirshenbaum' });
    await expect(outputs.nth(2)).toHaveText("'TO:nIk");
    await format.selectOption({ label: 'eSpeak' });
    await expect(outputs.nth(2)).toHaveText("[[T'O:nIk]]");
    await format.selectOption({ label: 'HTML' });
    await expect(outputs.nth(2)).toHaveText('<span lang="und-fonipa">/ˈθɔːnɪk/</span>');
    await page.getByRole('button', { name: 'Copy HTML' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Copied HTML' })).toBeAttached();
    expect(await copiedTexts(page)).toEqual(['<span lang="und-fonipa">/ˈθɔːnɪk/</span>']);
    await expectNoA11yViolations(page);

    // The choice is remembered (FR-42).
    await page.reload();
    await expect(format).toHaveValue('html');
  });

  test("FR-25: names the symbols a format can't write", async ({ page }) => {
    await page.goto('/#w=1:k.y.k');
    await page.getByRole('combobox', { name: 'Format' }).selectOption({ label: 'eSpeak' });
    const outputs = page.getByRole('region', { name: 'Word' }).locator('output');
    await expect(outputs.nth(2)).toHaveText('[[kk]]');
    await expect(page.getByText(/^eSpeak can’t write/)).toHaveText(
      'eSpeak can’t write y close front rounded vowel, so it is left out.',
    );
    await expectNoA11yViolations(page);
  });
});
