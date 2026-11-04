import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

const widths = [360, 768, 1280];

test.describe('app shell layout (SPEC §6, NFR-4)', () => {
  for (const width of widths) {
    test(`fits ${String(width)} px without sideways page scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('region', { name: 'Word' })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
      await expectNoA11yViolations(page);
    });
  }

  test('keeps the top bar in view when the page scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 400 });
    await page.goto('/');
    await page.evaluate(() => {
      document.querySelector('main')?.style.setProperty('min-height', '3000px');
      window.scrollTo(0, 1000);
    });
    const top = await page.getByRole('banner').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBe(0);
  });

  test('keeps the word card in view on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');
    await page.evaluate(() => {
      document.querySelector('main')?.style.setProperty('min-height', '3000px');
      window.scrollTo(0, 1000);
    });
    const word = page.getByRole('region', { name: 'Word' });
    const box = await word.boundingBox();
    expect(box?.y ?? -1).toBeGreaterThan(0);
    expect(box?.y ?? 1000).toBeLessThan(120);
  });
});
