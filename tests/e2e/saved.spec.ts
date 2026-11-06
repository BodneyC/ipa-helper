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

test.describe('two tabs (FR-16, FR-42, #2)', () => {
  test('FR-16: words saved in two tabs both survive', async ({ context }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    await a.goto('/');
    await b.goto('/');

    await build(a, ['ʃ', 'ɪ', 'p']);
    await a.getByRole('button', { name: 'Saved words…' }).click();
    const inA = a.getByRole('dialog', { name: 'Saved words' });
    await inA.getByRole('button', { name: 'Save current word' }).click();
    await expect(inA.getByRole('list', { name: 'Saved words' })).toContainText('/ʃɪp/');

    await build(b, ['θ']);
    await b.getByRole('button', { name: 'Saved words…' }).click();
    const inB = b.getByRole('dialog', { name: 'Saved words' });
    // B hears of A's word without a reload, and saving keeps it.
    await expect(inB.getByRole('list', { name: 'Saved words' })).toContainText('/ʃɪp/');
    await inB.getByRole('button', { name: 'Save current word' }).click();
    await expect(inB.getByRole('list', { name: 'Saved words' })).toContainText('/θ/');

    // A's open list picks up B's word too.
    await expect(inA.getByRole('list', { name: 'Saved words' })).toContainText('/θ/');
    await expectNoA11yViolations(a);

    await a.reload();
    await a.getByRole('button', { name: 'Saved words…' }).click();
    const list = a.getByRole('dialog', { name: 'Saved words' }).getByRole('list');
    await expect(list.getByRole('listitem')).toHaveCount(2);
    await expect(list).toContainText('/ʃɪp/');
    await expect(list).toContainText('/θ/');
  });

  test('FR-42: a setting changed in one tab applies in the other and survives its writes', async ({
    context,
  }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    await a.emulateMedia({ colorScheme: 'dark' });
    await a.goto('/');
    await b.goto('/');
    await expect(a.locator('html')).toHaveAttribute('data-theme', 'dark');

    await b.getByRole('button', { name: 'Settings' }).click();
    await b.getByRole('dialog', { name: 'Settings' }).getByRole('radio', { name: 'Light' }).check();
    await expect(a.locator('html')).toHaveAttribute('data-theme', 'light');

    await a.getByRole('button', { name: 'Settings' }).click();
    const inA = a.getByRole('dialog', { name: 'Settings' });
    await expect(inA.getByRole('radio', { name: 'Light' })).toBeChecked();
    await inA.getByRole('radio', { name: 'Hard' }).check();
    await expectNoA11yViolations(a);

    await expect(b.locator('html')).toHaveAttribute('data-contrast', 'hard');
    await expect(b.locator('html')).toHaveAttribute('data-theme', 'light');
    const stored = await b.evaluate(() => localStorage.getItem('ipa-helper:settings:v1'));
    expect(JSON.parse(stored ?? '{}')).toMatchObject({ theme: 'light', contrast: 'hard' });
  });
});
