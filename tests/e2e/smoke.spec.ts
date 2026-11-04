import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

test.describe('app shell', () => {
  test('loads with a title and heading, and has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('ipa-helper');
    await expect(page.getByRole('heading', { level: 1, name: 'ipa-helper' })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
