import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

test.describe('inventory and filter (FR-3, FR-4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('FR-4: "/" focuses the filter; "fric" leaves the fricatives', async ({ page }) => {
    await page.getByRole('heading', { level: 1 }).click();
    await page.keyboard.press('/');
    const filter = page.getByRole('searchbox', { name: 'Filter symbols' });
    await expect(filter).toBeFocused();
    await page.keyboard.type('fric');
    const palette = page.getByRole('region', { name: 'Symbols' });
    await expect(palette.getByRole('status')).toHaveText('10 symbols match “fric”.');
    await expect(palette.getByRole('heading', { level: 3 })).toHaveText(['Consonants']);
    await expect(palette.getByRole('button', { name: /^ʃ\s?,/ })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('FR-4: TIPA codes match case-sensitively: "S" finds ʃ', async ({ page }) => {
    const filter = page.getByRole('searchbox', { name: 'Filter symbols' });
    await filter.fill('S');
    const palette = page.getByRole('region', { name: 'Symbols' });
    await expect(palette.getByRole('button', { name: /^ʃ\s?,/ })).toBeVisible();
    await filter.fill('zzz');
    await expect(palette.getByRole('status')).toHaveText('No symbols match “zzz”.');
    await expect(palette.getByRole('button')).toHaveCount(0);
    await filter.fill('');
    await expect(palette.getByRole('heading', { level: 3 })).toHaveCount(5);
  });

  test('FR-3: the inventory switch shows RP; Full IPA is not available yet', async ({ page }) => {
    const inventory = page.getByRole('combobox', { name: 'Inventory' });
    await expect(inventory).toHaveValue('rp');
    await expect(inventory.getByRole('option', { name: /Full IPA/ })).toHaveJSProperty(
      'disabled',
      true,
    );
  });

  test('the top bar fits a 360 px phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    const bar = page.getByRole('banner');
    const overflow = await bar.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBe(0);
    await expect(page.getByRole('searchbox', { name: 'Filter symbols' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keyboard shortcuts' })).toBeInViewport();
    await expectNoA11yViolations(page);
  });
});
