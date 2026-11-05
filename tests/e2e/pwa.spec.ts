import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { NEXT_DEPLOY_COOKIE } from '../../scripts/pwa/plugin';

// The app's service worker (ADR-0013) is blocked in every other spec.
test.use({ serviceWorkers: 'allow' });

/** Loads the app and waits until its service worker controls the page. */
const loadControlled = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller === null) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      });
    }
  });
};

interface ManifestIcon {
  readonly src: string;
  readonly sizes: string;
  readonly purpose: string;
}

const isIcon = (value: unknown): value is ManifestIcon =>
  typeof value === 'object' &&
  value !== null &&
  'src' in value &&
  typeof value.src === 'string' &&
  'sizes' in value &&
  typeof value.sizes === 'string' &&
  'purpose' in value &&
  typeof value.purpose === 'string';

/** The manifest's icons, failing the test if they're malformed. */
const iconsOf = (manifest: unknown): readonly ManifestIcon[] => {
  const icons =
    typeof manifest === 'object' && manifest !== null && 'icons' in manifest
      ? manifest.icons
      : undefined;
  if (!Array.isArray(icons) || !icons.every(isIcon)) throw new Error('manifest: bad icons');
  return icons;
};

/**
 * "Deploys" a new version and has the browser check for it. The preview server
 * serves a changed sw.js to this context only (scripts/pwa/plugin.ts,
 * nextDeployPreviewPlugin), because Playwright can't route a worker's own script.
 */
const deployNextVersion = async (page: Page, context: BrowserContext, baseURL: string) => {
  await context.addCookies([{ ...NEXT_DEPLOY_COOKIE, url: baseURL }]);
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())?.update();
  });
};

/** A PNG's width and height, read from its IHDR chunk. */
const pngSize = (bytes: Buffer) => [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];

test.describe('install and offline (FR-60 – FR-62)', () => {
  test('FR-60: links a manifest that makes the app installable', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifestUrl = new URL(String(href), page.url());
    const response = await request.get(manifestUrl.href);
    expect(response.ok()).toBe(true);
    const manifest: unknown = await response.json();
    expect(manifest).toMatchObject({
      name: 'ipa-helper',
      short_name: 'ipa-helper',
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: expect.stringMatching(/^#[0-9a-f]{6}$/),
      theme_color: expect.stringMatching(/^#[0-9a-f]{6}$/),
    });
    const icons = iconsOf(manifest);
    expect(icons.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual([
      '192x192 any',
      '512x512 any',
      '512x512 maskable',
    ]);
    for (const icon of icons) {
      const png = await request.get(new URL(icon.src, manifestUrl).href);
      expect(png.headers()['content-type']).toBe('image/png');
      expect(pngSize(await png.body()).join('x')).toBe(icon.sizes);
    }
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
  });

  test('FR-61: works offline after one visit, reloads included', async ({ page, context }) => {
    await loadControlled(page);
    await context.setOffline(true);
    await page.reload();

    // The shell came from the cache: the page, scripts, styles and IPA font.
    await expectNoA11yViolations(page);
    const palette = page.getByRole('region', { name: 'Symbols' });
    for (const glyph of ['ˈ', 'ʃ', 'ɪ', 'p']) {
      await palette.getByRole('button', { name: new RegExp(`^${glyph}\\s?,`) }).click();
    }
    await expect(page.getByRole('textbox', { name: 'Word' })).toHaveText('/ˈʃɪp/');
    const fonts = await page.evaluate(async () => {
      const faces = await document.fonts.load('32px "ipa-helper IPA"', 'ʃ');
      return faces.map((face) => face.status);
    });
    expect(fonts).toEqual(['loaded']);

    // A fresh navigation, not only a reload, is answered from the cache too.
    await page.goto('/#w=1:theta');
    await expect(page.getByRole('textbox', { name: 'Word' })).toHaveText('/θ/');
  });

  test('FR-62: offers a newly deployed version, and Reload switches to it', async ({
    page,
    context,
    baseURL,
  }) => {
    await loadControlled(page);
    const firstWorker = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);

    await deployNextVersion(page, context, String(baseURL));

    const notice = page.getByRole('region', { name: 'Update' });
    await expect(notice).toContainText('A new version of ipa-helper is ready.');
    // Until the user agrees, the old version keeps control (FR-62).
    expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(
      firstWorker,
    );
    await expectNoA11yViolations(page);

    // Reload makes the waiting worker take over (so page and worker agree on the
    // skip-waiting message), and the reloaded page has no notice.
    const reloaded = page.waitForEvent('load');
    await notice.getByRole('button', { name: 'Reload' }).click();
    await reloaded;
    await expect(page.getByRole('region', { name: 'Symbols' })).toBeVisible();
    await expect(notice).toHaveCount(0);
    const waiting = await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistration())?.waiting ?? null,
    );
    expect(waiting).toBeNull();
  });

  test('FR-62: Later hides the notice and keeps the running version', async ({
    page,
    context,
    baseURL,
  }) => {
    await loadControlled(page);
    await deployNextVersion(page, context, String(baseURL));
    const notice = page.getByRole('region', { name: 'Update' });
    await notice.getByRole('button', { name: 'Later' }).click();
    await expect(notice).toHaveCount(0);
    const waiting = await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistration())?.waiting !== null,
    );
    expect(waiting).toBe(true);
  });
});
