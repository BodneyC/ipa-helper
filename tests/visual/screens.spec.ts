import { expect, test } from '@playwright/test';

/**
 * M3.8 visual regression (ADR-0005): the page in both themes at the three
 * breakpoints, with a word built so the outputs show. Diffs are reviewed, not
 * gating. Update baselines with `pnpm test:visual --update-snapshots`.
 */

const WIDTHS = [
  { width: 360, height: 740 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
] as const;
const THEMES = ['dark', 'light'] as const;
const WORD = '#w=1:primary-stress.f.l.turned-script-a.g.small-cap-i.esh';

for (const theme of THEMES) {
  for (const viewport of WIDTHS) {
    test(`page, ${theme}, ${String(viewport.width)} px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(`/${WORD}`);
      // Pin the UI font to a self-hosted face, so baselines don't depend on each
      // machine's system-ui font. Layout, colour and spacing are what's compared.
      await page.addStyleTag({ content: ":root { --font-ui: 'ipa-helper IPA', serif; }" });
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole('textbox', { name: 'Word' })).toHaveText('/ˈflɒɡɪʃ/');
      await expect(page).toHaveScreenshot(`page-${theme}-${String(viewport.width)}.png`, {
        fullPage: true,
      });
    });
  }
}
