import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

const widths = [360, 768, 1280];

test.describe('app shell layout (SPEC §6, NFR-4)', () => {
  for (const width of widths) {
    test(`fits ${String(width)} px without sideways page scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('region', { name: 'Word', exact: true })).toBeVisible();
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

  for (const viewport of [
    { width: 360, height: 640, name: 'a phone in portrait' },
    { width: 844, height: 390, name: 'a phone in landscape' },
  ]) {
    test(`#4: on ${viewport.name}, the sticky word strip takes at most 40% of the screen`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/#w=1:primary-stress.f.l.turned-script-a.g.small-cap-i.esh');
      const strip = page.getByRole('region', { name: 'Word', exact: true });
      await expect(strip.getByRole('button', { name: 'Play word' })).toBeVisible();
      await expect(strip.getByRole('button', { name: 'Undo' })).toBeVisible();
      await expect(strip.getByRole('button', { name: 'Redo' })).toBeVisible();

      // Reach a key far down the palette, and use it: the strip stays put and small.
      const key = page.getByRole('button', { name: /^ʊə\s?,/ });
      await key.scrollIntoViewIfNeeded();
      await key.click();
      await expect(page.getByRole('textbox', { name: 'Word' })).toHaveText('/ˈflɒɡɪʃʊə/');
      const box = await strip.boundingBox();
      expect(box?.y ?? -1).toBeGreaterThan(0);
      expect((box?.y ?? 0) + (box?.height ?? viewport.height)).toBeLessThanOrEqual(
        viewport.height * 0.4,
      );
      await expectNoA11yViolations(page);
    });
  }

  test('#4: More shows and hides the word details, by keyboard, and is remembered', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/#w=1:f.l.turned-script-a.g');
    const more = page.getByRole('button', { name: 'More word tools' });
    const details = page.getByRole('region', { name: 'Word details' });
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(details.getByRole('button', { name: 'Copy IPA' })).toBeVisible();
    await expect(details.getByRole('button', { name: 'Clear' })).toBeVisible();

    await more.focus();
    await page.keyboard.press('Enter');
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(details).toBeHidden();
    await expectNoA11yViolations(page);

    await page.reload();
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(details).toBeHidden();

    await more.focus();
    await page.keyboard.press('Space');
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(details.getByRole('button', { name: 'Copy IPA' })).toBeVisible();
  });

  test('#4: large screens keep one word card with no More button', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const card = page.getByRole('region', { name: 'Word', exact: true });
    await expect(card.getByRole('button', { name: 'Copy IPA' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Paste IPA…' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'More word tools' })).toHaveCount(0);
  });
});
