import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

test.describe('paste IPA (FR-17)', () => {
  test('FR-17: pasted IPA becomes the word, in one undoable step', async ({ page }) => {
    await page.goto('/');
    const opener = page.getByRole('button', { name: 'Paste IPA…' });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Paste IPA' });
    await expect(dialog).toBeVisible();
    await expectNoA11yViolations(page);

    // insertText puts the whole string in at once, as a paste does.
    await dialog.getByRole('textbox', { name: 'IPA text' }).focus();
    await page.keyboard.insertText('/ˈθɔːnɪk/');
    await expect(dialog.getByText(/Reads as/)).toHaveText('Reads as /ˈθɔːnɪk/, 6 symbols.');
    await dialog.getByRole('button', { name: 'Use as word' }).click();
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();

    const outputs = page.getByRole('region', { name: 'Word' }).locator('output');
    await expect(outputs.first()).toHaveText('/ˈθɔːnɪk/');
    await expect(outputs.last()).toHaveText('"TO:nIk');
    await expect(page).toHaveURL(/#w=1:primary-stress\.theta\.open-o-long\.n\.small-cap-i\.k$/);

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(outputs.first()).toHaveText('—');
  });

  test('FR-17: unknown characters are reported, not dropped', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Paste IPA…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Paste IPA' });
    const input = dialog.getByRole('textbox', { name: 'IPA text' });
    await input.focus();
    await page.keyboard.insertText('fl0g');
    await expect(dialog.getByText(/Not recognised/)).toHaveText(
      'Not recognised: ‘0’ at position 3.',
    );
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByRole('button', { name: 'Use as word' })).toBeDisabled();
    await expectNoA11yViolations(page);

    // ASCII g reads as ɡ; once the digit is gone the text is usable.
    await input.fill('flɒg');
    await expect(dialog.getByText(/Reads as/)).toHaveText('Reads as /flɒɡ/, 4 symbols.');
  });

  test('FR-17: full-IPA symbols and diacritics paste even in the RP view', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Paste IPA…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Paste IPA' });
    await dialog.getByRole('textbox', { name: 'IPA text' }).fill('[tʰẽç]');
    await dialog.getByRole('button', { name: 'Use as word' }).click();
    const outputs = page.getByRole('region', { name: 'Word' }).locator('output');
    await expect(outputs.last()).toHaveText('t\\super{h}\\~{e}\\c{c}');
  });
});
