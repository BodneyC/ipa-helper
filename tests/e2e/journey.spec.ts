import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { copiedTexts, recordClipboard } from './clipboard';

test('M2.9: build /ˈθɔːnɪk/ by clicking, copy both outputs, and share it', async ({
  page,
  context,
}) => {
  await recordClipboard(page);
  await page.goto('/');
  await expectNoA11yViolations(page);

  // Build the word by clicking palette keys (FR-10).
  const palette = page.getByRole('region', { name: 'Symbols' });
  for (const glyph of ['ˈ', 'θ', 'ɔː', 'n', 'ɪ', 'k']) {
    await palette.getByRole('button', { name: new RegExp(`^${glyph}\\s?,`) }).click();
  }

  // Both outputs (FR-11, FR-20, FR-21).
  const workbench = page.getByRole('region', { name: 'Word' });
  await expect(page.getByRole('textbox', { name: 'Word' })).toHaveText('/ˈθɔːnɪk/');
  await expect(workbench.locator('output').first()).toHaveText('/ˈθɔːnɪk/');
  await expect(workbench.locator('output').last()).toHaveText('"TO:nIk');

  // Copy (FR-20, FR-21, FR-23).
  await page.getByRole('button', { name: 'Copy IPA' }).click();
  await page.getByRole('button', { name: 'Copy TIPA' }).click();
  await page.getByRole('button', { name: 'Copy \\ipa{…} macro call' }).click();
  expect(await copiedTexts(page)).toEqual(['/ˈθɔːnɪk/', '"TO:nIk', '\\ipa{"TO:nIk}']);
  await expect(page.getByRole('status').filter({ hasText: /Copied \\ipa/ })).toBeAttached();
  await expectNoA11yViolations(page);

  // The URL now carries the word (FR-15)…
  await expect(page).toHaveURL(/#w=1:primary-stress\.theta\.open-o-long\.n\.small-cap-i\.k$/);
  const shared = page.url();

  // …so reloading restores it,
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Word' })).toHaveText('/ˈθɔːnɪk/');

  // and so does opening the link in a fresh tab.
  const other = await context.newPage();
  await other.goto(shared);
  await expect(other.getByRole('textbox', { name: 'Word' })).toHaveText('/ˈθɔːnɪk/');
  await expect(other.getByRole('region', { name: 'Word' }).locator('output').last()).toHaveText(
    '"TO:nIk',
  );
  await expectNoA11yViolations(other);
});
