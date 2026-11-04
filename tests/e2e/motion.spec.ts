import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

const animationOf = (el: Locator) => el.evaluate((e) => getComputedStyle(e).animationName);
const pulseOf = (key: Locator) => key.locator('[aria-hidden="true"]').last();

test.describe('micro-interactions (SPEC §6)', () => {
  test('a key pulses when added, and the addition is announced', async ({ page }) => {
    await page.goto('/');
    const key = page.getByRole('button', { name: /^ʃ\s?,/ });
    const transform = () => key.evaluate((e) => getComputedStyle(e).transform);
    await key.hover();
    expect(await transform()).not.toBe('none');
    // Let the lift settle first: Playwright retries clicks on moving targets by scrolling.
    await page.mouse.move(0, 0);
    await expect.poll(transform).toBe('none');
    await key.click();
    expect(await animationOf(pulseOf(key))).toMatch(/pulse(?!-fade)/);
    await expect(page.getByRole('status').filter({ hasText: 'Added ʃ' })).toBeAttached();
    await expectNoA11yViolations(page);
  });

  test('with reduced motion nothing moves: no lift, a fading pulse, a steady cursor', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const key = page.getByRole('button', { name: /^ʃ\s?,/ });
    await key.hover();
    expect(await key.evaluate((e) => getComputedStyle(e).transform)).toBe('none');
    await key.click();
    expect(await animationOf(pulseOf(key))).toMatch(/pulse-fade/);
    const word = page.getByRole('textbox', { name: 'Word' });
    const animated = await word.evaluate((root) =>
      [...root.querySelectorAll('*')].some((e) => getComputedStyle(e).animationName !== 'none'),
    );
    expect(animated).toBe(false);
  });
});
