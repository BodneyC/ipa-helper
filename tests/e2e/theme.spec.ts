import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

const SETTINGS_KEY = 'ipa-helper:settings:v1';

/** The page background as the browser computed it. */
const background = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);

test.describe('theme (FR-40, FR-41, ADR-0006)', () => {
  test('FR-40: follows a dark system preference by default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'medium');
    expect(await background(page)).toBe('rgb(40, 40, 40)');
    await expectNoA11yViolations(page);
  });

  test('FR-40: follows a light system preference by default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await background(page)).toBe('rgb(251, 241, 199)');
    await expectNoA11yViolations(page);
  });

  test('FR-40: a stored override beats the system preference, from first paint', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({ theme: 'light', contrast: 'hard' }));
    }, SETTINGS_KEY);
    await page.goto('/');
    // Checked before React runs: the attribute must already be set by the inline script.
    const atFirstPaint = await page.evaluate(() => document.documentElement.dataset['theme']);
    expect(atFirstPaint).toBe('light');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'hard');
    expect(await background(page)).toBe('rgb(249, 245, 215)');
    await expectNoA11yViolations(page);
  });

  test('FR-41: corrupt storage falls back to the default theme and contrast', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript((key) => {
      localStorage.setItem(key, '{not json');
    }, SETTINGS_KEY);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'medium');
  });

  test('FR-40: tracks a system theme change while open', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
