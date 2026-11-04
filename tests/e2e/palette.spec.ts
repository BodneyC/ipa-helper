import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

test.describe('symbol palette (FR-1, FR-2)', () => {
  test('FR-1: shows the RP groups in order, consonants as a chart', async ({ page }) => {
    await page.goto('/');
    const palette = page.getByRole('region', { name: 'Symbols' });
    await expect(palette.getByRole('heading', { level: 3 })).toHaveText([
      'Consonants',
      'Affricates',
      'Vowels',
      'Diphthongs',
      'Suprasegmentals',
    ]);
    const chart = page.getByRole('region', { name: 'Consonants' }).getByRole('table');
    await expect(chart.getByRole('columnheader', { name: 'Postalveolar' })).toBeVisible();
    await expect(chart.getByRole('rowheader', { name: 'Fricative' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('FR-2: hovering a key shows its name, example and TIPA', async ({ page }) => {
    await page.goto('/');
    const key = page.getByRole('button', {
      name: /^ʃ\s?, voiceless postalveolar fricative, as in ship$/,
    });
    await key.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('voiceless postalveolar fricative');
    await expect(tooltip).toContainText('ship');
    await expect(tooltip).toContainText('TIPA S');
    await expectNoA11yViolations(page);
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
  });

  test('FR-2: focusing a key shows its tooltip, and Escape dismisses it', async ({ page }) => {
    await page.goto('/');
    const key = page.getByRole('button', { name: /^æ\s?,/ });
    await key.focus();
    await expect(page.getByRole('tooltip')).toContainText('TIPA \\ae{}');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toBeHidden();
    await expect(key).toBeFocused();
  });

  test('FR-1: vowels sit on the trapezoid, close front top left and open back bottom right', async ({
    page,
  }) => {
    await page.goto('/');
    const chart = page
      .getByRole('region', { name: 'Vowels' })
      .getByRole('figure', { name: /^Vowel chart/ });
    await expect(chart).toBeVisible();
    const box = (name: RegExp) =>
      chart.getByRole('button', { name }).evaluate((k) => {
        const r = k.getBoundingClientRect();
        return { x: r.x, y: r.y };
      });
    const closeFront = await box(/^i\s?, close front/);
    const nearCloseFront = await box(/^ɪ\s?,/);
    const openBack = await box(/^ɒ\s?,/);
    const openMidFront = await box(/^ɛ\s?,/);
    expect(closeFront.y).toBeLessThan(nearCloseFront.y);
    expect(closeFront.x).toBeLessThan(openMidFront.x); // the front edge slants
    expect(openBack.y).toBeGreaterThan(openMidFront.y);
    expect(openBack.x).toBeGreaterThan(openMidFront.x);
    // No two keys overlap.
    const boxes = await chart.getByRole('button').evaluateAll((keys) =>
      keys.map((k) => {
        const r = k.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      }),
    );
    expect(boxes).toHaveLength(16);
    const overlaps = boxes.flatMap((a, i) =>
      boxes
        .slice(i + 1)
        .filter(
          (b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
        ),
    );
    expect(overlaps).toEqual([]);
    await expectNoA11yViolations(page);
  });

  test('FR-5: collapsed groups stay collapsed after a reload', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Diphthongs' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const diphthongs = page.getByRole('region', { name: 'Diphthongs' });
    await expect(diphthongs.getByRole('button', { name: /^eɪ\s?,/ })).toBeHidden();
    await expectNoA11yViolations(page);

    await page.reload();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(diphthongs.getByRole('button', { name: /^eɪ\s?,/ })).toBeHidden();
    await toggle.press('Enter');
    await expect(diphthongs.getByRole('button', { name: /^eɪ\s?,/ })).toBeVisible();
  });

  test('NFR-4: keys are at least 44 × 44 px', async ({ page }) => {
    await page.goto('/');
    const sizes = await page
      .getByRole('region', { name: 'Symbols' })
      .getByRole('button')
      .evaluateAll((keys) => keys.map((k) => k.getBoundingClientRect()));
    expect(sizes.length).toBeGreaterThan(50);
    for (const { width, height } of sizes) {
      expect(width).toBeGreaterThanOrEqual(44);
      expect(height).toBeGreaterThanOrEqual(44);
    }
  });

  test('the consonant chart scrolls inside its card on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    await expectNoA11yViolations(page);
  });
});
