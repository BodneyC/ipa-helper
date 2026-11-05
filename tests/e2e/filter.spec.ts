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

  test('FR-3: RP hides full-IPA symbols, and Full IPA shows them to the filter', async ({
    page,
  }) => {
    const inventory = page.getByRole('combobox', { name: 'Inventory' });
    const filter = page.getByRole('searchbox', { name: 'Filter symbols' });
    await expect(inventory).toHaveValue('rp');
    await filter.fill('retroflex');
    await expect(page.getByText('No symbols match “retroflex”.')).toBeVisible();
    await inventory.selectOption({ label: 'Full IPA' });
    await expect(page.getByText('8 symbols match “retroflex”.')).toBeVisible();
    await expect(page.getByRole('button', { name: /^ʈ\s?,/ })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('the top bar fits a 360 px phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    const bar = page.getByRole('banner');
    const overflow = await bar.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBe(0);
    await expect(page.getByRole('searchbox', { name: 'Filter symbols' })).toBeVisible();
    const right = await page
      .getByRole('combobox', { name: 'Inventory' })
      .evaluate((el) => el.getBoundingClientRect().right);
    const left = await page
      .getByRole('searchbox', { name: 'Filter symbols' })
      .evaluate((el) => el.getBoundingClientRect().left);
    expect(right).toBeLessThan(left);
    await expect(page.getByRole('button', { name: 'Settings' })).toBeInViewport();
    await expectNoA11yViolations(page);
  });
});
