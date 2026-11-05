import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

const showFullIpa = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Inventory' }).selectOption({ label: 'Full IPA' });
};

/** Pairs of keys inside `scope` whose boxes overlap. */
const overlaps = async (scope: Locator) => {
  const boxes = await scope.getByRole('button').evaluateAll((keys) =>
    keys.map((k) => {
      const r = k.getBoundingClientRect();
      return { name: k.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }),
  );
  return boxes.flatMap((a, i) =>
    boxes
      .slice(i + 1)
      .filter((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
      .map((b) => `${a.name} × ${b.name}`),
  );
};

test.describe('full IPA inventory (FR-3, SPEC §7.6)', () => {
  test('FR-3: the switch shows the full IPA, and the choice survives a reload', async ({
    page,
  }) => {
    await showFullIpa(page);
    const palette = page.getByRole('region', { name: 'Symbols' });
    await expect(palette.getByRole('heading', { level: 3 })).toHaveText([
      'Consonants',
      'Affricates',
      'Non-pulmonic consonants',
      'Vowels',
      'Diphthongs',
      'Suprasegmentals',
    ]);
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Inventory' })).toHaveValue('extended');
    await expect(palette.getByRole('heading', { name: 'Non-pulmonic consonants' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('FR-1: the consonant chart has every column and row of the IPA chart', async ({ page }) => {
    await showFullIpa(page);
    const chart = page.getByRole('region', { name: 'Consonants', exact: true }).getByRole('table');
    await expect(chart.getByRole('columnheader')).toHaveCount(12);
    for (const place of ['Retroflex', 'Uvular', 'Pharyngeal']) {
      await expect(chart.getByRole('columnheader', { name: place })).toBeAttached();
    }
    await expect(chart.getByRole('rowheader', { name: 'Lateral fricative' })).toBeAttached();
    const key = chart.getByRole('button', { name: /^ɬ\s?, voiceless alveolar lateral fricative$/ });
    await key.hover();
    await expect(page.getByRole('tooltip')).toContainText('TIPA \\textbeltl{}');
    await expectNoA11yViolations(page);
  });

  test('FR-10: an extended symbol adds to the word, and ç writes \\c{c}', async ({ page }) => {
    await showFullIpa(page);
    await page.getByRole('button', { name: /^ç\s?,/ }).click();
    await page.getByRole('button', { name: /^ʘ\s?,/ }).click();
    await expect(page.getByRole('textbox', { name: 'Word' })).toContainText('çʘ');
    await expect(page.getByText('\\c{c}\\textbullseye{}', { exact: true })).toBeVisible();
  });

  test('FR-1: the vowel trapezoid fits every IPA vowel without overlapping keys', async ({
    page,
  }) => {
    await showFullIpa(page);
    const chart = page
      .getByRole('region', { name: 'Vowels' })
      .getByRole('figure', { name: /^Vowel chart/ });
    await expect(chart.getByRole('button')).toHaveCount(33);
    expect(await overlaps(chart)).toEqual([]);
    await expectNoA11yViolations(page);
  });

  test('NFR-4: keys stay at least 44 × 44 px and the page never scrolls sideways on a phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await showFullIpa(page);
    const sizes = await page
      .getByRole('region', { name: 'Symbols' })
      .getByRole('button')
      .evaluateAll((keys) => keys.map((k) => k.getBoundingClientRect()));
    expect(sizes.length).toBeGreaterThan(120);
    for (const { width, height } of sizes) {
      expect(width).toBeGreaterThanOrEqual(44);
      expect(height).toBeGreaterThanOrEqual(44);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    await expectNoA11yViolations(page);
  });
});
