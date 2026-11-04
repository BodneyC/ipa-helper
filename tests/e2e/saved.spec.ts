import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

const build = async (page: Page, glyphs: readonly string[]) => {
  const palette = page.getByRole('region', { name: 'Symbols' });
  for (const glyph of glyphs) {
    await palette.getByRole('button', { name: new RegExp(`^${glyph}\\s?,`) }).click();
  }
};

test('FR-16: save words with glosses, then reload, rename and delete them', async ({ page }) => {
  await page.goto('/');
  const word = page.getByRole('textbox', { name: 'Word' });
  await build(page, ['ʃ', 'ɪ', 'p']);

  await page.getByRole('button', { name: 'Saved words…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Saved words' });
  await dialog.getByRole('textbox', { name: /^Gloss for \/ʃɪp\// }).fill('boat');
  await dialog.getByRole('button', { name: 'Save current word' }).click();
  await expect(dialog.getByRole('list', { name: 'Saved words' })).toContainText('/ʃɪp/');
  await expectNoA11yViolations(page);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Clear' }).click();
  await build(page, ['θ']);
  await page.reload();

  await page.getByRole('button', { name: 'Saved words…' }).click();
  await dialog.getByRole('button', { name: /^Rename\s?\/ʃɪp\/ \(boat\)$/ }).click();
  const gloss = dialog.getByRole('textbox', { name: 'Gloss for /ʃɪp/', exact: true });
  await gloss.fill('vessel');
  await gloss.press('Enter');
  await expect(dialog.getByText('vessel', { exact: true })).toBeVisible();

  await dialog.getByRole('button', { name: /^Load\s?\/ʃɪp\/ \(vessel\)$/ }).click();
  await expect(dialog).toBeHidden();
  await expect(word).toHaveText('/ʃɪp/');

  await page.getByRole('button', { name: 'Saved words…' }).click();
  await dialog.getByRole('button', { name: /^Delete\s?\/ʃɪp\/ \(vessel\)$/ }).click();
  await expect(dialog.getByText('No saved words yet.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Saved words…' }).click();
  await expect(dialog.getByText('No saved words yet.')).toBeVisible();
});
