import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

declare global {
  interface Window {
    /** Durations (s) of every buffer the app started playing; set by the init script below. */
    __played?: number[];
  }
}

/**
 * Records each Web Audio source the app starts. A buffer only gets this far
 * once the browser has fetched and decoded the real Opus clip, so this checks
 * decoding in every browser project, WebKit included.
 */
const recordPlayback = (page: Page) =>
  page.addInitScript(() => {
    window.__played = [];
    const start: unknown = Reflect.get(AudioBufferSourceNode.prototype, 'start');
    if (typeof start !== 'function') return;
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.__played?.push(this.buffer?.duration ?? 0);
      Reflect.apply(start, this, args);
    };
  });

const played = (page: Page) => page.evaluate(() => window.__played ?? []);

const word = (page: Page) => page.getByRole('textbox', { name: 'Word' });
const eshKey = (page: Page) => page.getByRole('button', { name: /^ʃ\s?, voiceless postalveolar/ });
/** The speaker is hidden from assistive technology, so it is found by its title. */
const eshSpeaker = (page: Page) => page.locator('button[title="Listen to ʃ"]');

test.describe('symbol audio (FR-30, FR-33, FR-34)', () => {
  test.beforeEach(async ({ page }) => {
    await recordPlayback(page);
    await page.goto('/');
  });

  test('FR-30/FR-33: hovering a key shows its speaker, which plays the clip lazily', async ({
    page,
  }) => {
    const clips: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('.opus')) clips.push(request.url());
    });
    await expect(eshSpeaker(page)).toHaveCSS('opacity', '0');
    expect(clips).toEqual([]);

    await eshKey(page).hover();
    await expect(eshSpeaker(page)).toHaveCSS('opacity', '1');
    await expectNoA11yViolations(page);

    await eshSpeaker(page).click();
    await expect.poll(() => played(page)).toHaveLength(1);
    const [duration = 0] = await played(page);
    expect(duration).toBeGreaterThan(0.2);
    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatch(/\/esh-[\w-]+\.opus$/);

    // Played again from memory: no second fetch, and nothing was added.
    await eshSpeaker(page).click();
    await expect.poll(() => played(page)).toHaveLength(2);
    expect(clips).toHaveLength(1);
    await expect(word(page)).toHaveText('/…/');
  });

  test('FR-30: Alt+click and Alt+Enter play without adding; marks have no speaker', async ({
    page,
  }) => {
    await eshKey(page).click({ modifiers: ['Alt'] });
    await expect.poll(() => played(page)).toHaveLength(1);
    await eshKey(page).press('Alt+Enter');
    await expect.poll(() => played(page)).toHaveLength(2);
    await expect(word(page)).toHaveText('/…/');

    await eshKey(page).press('Enter');
    await expect(word(page)).toHaveText('/ʃ/');
    await expect(page.getByRole('tooltip')).toContainText('Listen: Alt+click or Alt+Enter');
    await expect(page.locator('button[title="Listen to ˈ"]')).toHaveCount(0);
  });

  test('FR-34: Sound on select plays each symbol as it is added, and persists', async ({
    page,
  }) => {
    await eshKey(page).click();
    await expect(word(page)).toHaveText('/ʃ/');
    expect(await played(page)).toEqual([]);

    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    const toggle = dialog.getByRole('checkbox', { name: /Sound on select/ });
    await expect(toggle).not.toBeChecked();
    await toggle.check();
    await expectNoA11yViolations(page);
    await page.keyboard.press('Escape');

    await eshKey(page).click();
    await expect(word(page)).toHaveText('/ʃʃ/');
    await expect.poll(() => played(page)).toHaveLength(1);

    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(
      page
        .getByRole('dialog', { name: 'Settings' })
        .getByRole('checkbox', { name: /Sound on select/ }),
    ).toBeChecked();
  });
});
