import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

const word = (page: Page) => page.getByRole('textbox', { name: 'Word' });
const key = (page: Page, glyph: string) =>
  page
    .getByRole('region', { name: 'Symbols' })
    .getByRole('button', { name: new RegExp(`^${glyph}\\s?,`) });

test.describe('shareable URL (FR-15)', () => {
  test('FR-15: edits are mirrored into the fragment without new history entries', async ({
    page,
  }) => {
    await page.goto('/');
    const historyBefore = await page.evaluate(() => history.length);
    for (const glyph of ['θ', 'ɪ', 'n']) await key(page, glyph).click();
    await expect(page).toHaveURL(/#w=1:theta\.small-cap-i\.n$/);
    expect(await page.evaluate(() => history.length)).toBe(historyBefore);
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('FR-15: opening a shared link restores the word', async ({ page }) => {
    await page.goto('/#w=1:primary-stress.theta.open-o-long.n.small-cap-i.k');
    await expect(word(page)).toHaveText('/ˈθɔːnɪk/');
    await expect(page.getByRole('status').filter({ hasText: 'ignored' })).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test('FR-15: an invalid link is ignored with a non-blocking notice', async ({ page }) => {
    await page.goto('/#w=1:theta.nonsense');
    await expect(word(page)).toHaveText('/…/');
    const notice = page.getByRole('status').filter({ hasText: 'nonsense' });
    await expect(notice).toBeVisible();
    await expectNoA11yViolations(page);
    // The page stays usable, and the notice can be dismissed.
    await key(page, 'p').click();
    await expect(word(page)).toHaveText('/p/');
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(notice).toHaveCount(0);
  });

  test('FR-15: pasting a new link into the same tab loads it as an undoable edit', async ({
    page,
  }) => {
    await page.goto('/#w=1:p');
    await page.evaluate(() => {
      location.hash = 'w=1:k.ash.t';
    });
    await expect(word(page)).toHaveText('/kæt/');
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(word(page)).toHaveText('/p/');
  });
});
