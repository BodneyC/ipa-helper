import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { copiedTexts, recordClipboard } from './clipboard';

test.describe('keyboard (FR-50, FR-51)', () => {
  test.beforeEach(async ({ page }) => {
    await recordClipboard(page);
    await page.goto('/');
  });

  test('FR-50: each group is one Tab stop; arrows move within it', async ({ page }) => {
    const palette = page.getByRole('region', { name: 'Symbols' });
    const consonants = page.getByRole('region', { name: 'Consonants' });
    await consonants.getByRole('button', { name: /^p\s?,/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(consonants.getByRole('button', { name: /^b\s?,/ })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(consonants.getByRole('button', { name: /^m\s?,/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('textbox', { name: 'Word' })).toHaveText('/m/');

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('region', { name: 'Affricates' }).getByRole('button').first(),
    ).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(consonants.getByRole('button', { name: /^m\s?,/ })).toBeFocused();

    const tabStops = await palette
      .getByRole('button')
      .evaluateAll((keys) => keys.filter((k) => k.getAttribute('tabindex') === '0').length);
    expect(tabStops).toBe(5);
    await expectNoA11yViolations(page);
  });

  test('FR-50: ↓ walks down the vowel trapezoid', async ({ page }) => {
    const vowels = page.getByRole('region', { name: 'Vowels' });
    await vowels.getByRole('button', { name: /^i\s?, close front/ }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(vowels.getByRole('button', { name: /^ɪ\s?,/ })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(vowels.getByRole('button', { name: /^e\s?,/ })).toBeFocused();
  });

  test('FR-51: word keys work outside text inputs; copy shortcuts copy', async ({ page }) => {
    const word = page.getByRole('textbox', { name: 'Word' });
    for (const glyph of ['ʃ', 'ɪ', 'p']) {
      await page.getByRole('button', { name: new RegExp(`^${glyph}\\s?,`) }).click();
    }
    await page.getByRole('heading', { level: 1 }).click();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Backspace');
    await expect(word).toHaveText('/ʃp/');
    await page.keyboard.press('ControlOrMeta+Shift+C');
    await page.keyboard.press('ControlOrMeta+Shift+L');
    await expect.poll(() => copiedTexts(page)).toEqual(['/ʃp/', 'Sp']);
    await expect(page.getByRole('status').filter({ hasText: 'Copied TIPA' })).toBeAttached();
  });

  test('FR-14: Ctrl+Z and Ctrl+Shift+Z undo and redo after a palette click', async ({ page }) => {
    const word = page.getByRole('textbox', { name: 'Word' });
    await page.getByRole('button', { name: /^ʃ\s?,/ }).click();
    await page.getByRole('button', { name: /^ɪ\s?,/ }).click();
    await expect(word).toHaveText('/ʃɪ/');
    await page.keyboard.press('ControlOrMeta+Z');
    await expect(word).toHaveText('/ʃ/');
    await page.keyboard.press('ControlOrMeta+Shift+Z');
    await expect(word).toHaveText('/ʃɪ/');

    const filter = page.getByRole('searchbox', { name: 'Filter symbols' });
    await filter.fill('ship');
    await page.keyboard.press('ControlOrMeta+Z');
    await expect(word).toHaveText('/ʃɪ/');
    await expectNoA11yViolations(page);
  });

  test('FR-51: ? opens the shortcuts dialog; Escape closes it and returns focus', async ({
    page,
  }) => {
    const opener = page.getByRole('button', { name: 'Keyboard shortcuts' });
    await opener.focus();
    await page.keyboard.press('?');
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('rowheader', { name: 'Ctrl + Shift + L' })).toBeVisible();
    await expectNoA11yViolations(page);
    // Modal: focus starts inside, and Tab never reaches the page behind.
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Tab');
    const outside = await page.evaluate(
      () =>
        document.activeElement !== document.body &&
        document.activeElement?.closest('dialog') === null,
    );
    expect(outside).toBe(false);
    await dialog.getByRole('button', { name: 'Close' }).focus();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });
});
