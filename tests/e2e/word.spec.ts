import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

const key = (page: Page, glyph: string) =>
  page.getByRole('region', { name: 'Symbols' }).getByRole('button', {
    name: new RegExp(`^${glyph}\\s?,`),
  });

const word = (page: Page) => page.getByRole('textbox', { name: 'Word' });

test.describe('building a word (FR-10 – FR-14)', () => {
  test('FR-10/FR-11: clicking keys builds /ˈθɔːnɪk/', async ({ page }) => {
    await page.goto('/');
    await expect(word(page)).toHaveText('/…/');
    for (const glyph of ['ˈ', 'θ', 'ɔː', 'n', 'ɪ', 'k']) await key(page, glyph).click();
    await expect(word(page)).toHaveText('/ˈθɔːnɪk/');
    await expectNoA11yViolations(page);
  });

  test('FR-10: Enter and Space on a focused key also append', async ({ page }) => {
    await page.goto('/');
    await key(page, 'p').focus();
    await page.keyboard.press('Enter');
    await key(page, 'æ').focus();
    await page.keyboard.press('Space');
    await expect(word(page)).toHaveText('/pæ/');
  });

  test('FR-12/FR-13: keyboard editing in the word', async ({ page }) => {
    await page.goto('/');
    for (const glyph of ['f', 'l', 'ɒ', 'ɡ']) await key(page, glyph).click();
    await word(page).focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Backspace');
    await expect(word(page)).toHaveText('/flɡ/');
    // Inserting goes at the cursor.
    await key(page, 'ɪ').click();
    await expect(word(page)).toHaveText('/flɪɡ/');
    await word(page).focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('Delete');
    await expect(word(page)).toHaveText('/lɪɡ/');
    await expectNoA11yViolations(page);
  });

  test('FR-12: clicking a token moves the cursor there', async ({ page }) => {
    await page.goto('/');
    for (const glyph of ['p', 'æ', 't']) await key(page, glyph).click();
    // Click the right edge of the first token: the cursor goes after it.
    const first = word(page).locator('[data-index="0"]');
    const { width, height } = await first.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    await first.click({ position: { x: width - 1, y: height / 2 } });
    await key(page, 'l').click();
    await expect(word(page)).toHaveText('/plæt/');
  });

  test('FR-13/FR-14: Clear can be undone, and undo/redo cover every edit', async ({ page }) => {
    await page.goto('/');
    for (const glyph of ['s', 'ɪ']) await key(page, glyph).click();
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(word(page)).toHaveText('/…/');
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(word(page)).toHaveText('/sɪ/');
    await word(page).focus();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(word(page)).toHaveText('/s/');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(word(page)).toHaveText('/sɪ/');
    await expectNoA11yViolations(page);
  });
});
