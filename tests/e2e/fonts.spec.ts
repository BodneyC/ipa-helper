import { expect, test } from '@playwright/test';

test.describe('self-hosted fonts (NFR-7)', () => {
  test('preloads both font subsets from our own origin and can render IPA with them', async ({
    page,
    baseURL,
  }) => {
    const fontResponses: string[] = [];
    page.on('response', (response) => {
      if (response.url().endsWith('.woff2') && response.ok()) fontResponses.push(response.url());
    });
    await page.goto('/');
    await expect
      .poll(() => fontResponses.toSorted())
      .toEqual([
        `${String(baseURL)}/fonts/ipa-helper-ipa.woff2`,
        `${String(baseURL)}/fonts/jetbrains-mono-ascii.woff2`,
      ]);
    const loaded = await page.evaluate(async () => {
      const faces = await document.fonts.load('32px "ipa-helper IPA"', 'ˈθɔːnɪk ɡ ɹ');
      return faces.map((f) => f.family);
    });
    expect(loaded).toEqual(['ipa-helper IPA']);
  });
});
