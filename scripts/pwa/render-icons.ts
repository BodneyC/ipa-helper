/**
 * Draws the app icons (FR-60, ADR-0013) into `public/icons/`: a schwa in the
 * self-hosted IPA font, Gruvbox yellow on dark0. Run with `pnpm icons:render`
 * after changing the font or palette, and commit the PNGs.
 *
 * - `icon-192.png`, `icon-512.png`: rounded squares on a transparent ground.
 * - `icon-maskable-512.png`: full bleed, glyph inside the 80% safe zone.
 * - `apple-touch-icon.png`: 180 px, full bleed (iOS rounds the corners itself).
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { colour, readPalette } from './palette';

const root = new URL('../../', import.meta.url);
const outDir = fileURLToPath(new URL('public/icons/', root));
const font = readFileSync(new URL('public/fonts/ipa-helper-ipa.woff2', root)).toString('base64');

interface Icon {
  readonly file: string;
  readonly size: number;
  /** Corner radius as a fraction of the size; 0 is full bleed. */
  readonly radius: number;
  /** Font size as a fraction of the icon. The schwa's ink is about half the font size. */
  readonly glyph: number;
}

const ICONS: readonly Icon[] = [
  { file: 'icon-192.png', size: 192, radius: 0.22, glyph: 1 },
  { file: 'icon-512.png', size: 512, radius: 0.22, glyph: 1 },
  { file: 'icon-maskable-512.png', size: 512, radius: 0, glyph: 0.8 },
  { file: 'apple-touch-icon.png', size: 180, radius: 0, glyph: 0.95 },
];

const page = (icon: Icon, background: string, foreground: string) => `<!doctype html>
<style>
  @font-face { font-family: ipa; src: url(data:font/woff2;base64,${font}) format('woff2'); }
  html, body { margin: 0; background: transparent; }
  div {
    display: grid; place-items: center;
    width: ${String(icon.size)}px; height: ${String(icon.size)}px;
    border-radius: ${String(icon.radius * icon.size)}px;
    background: ${background}; color: ${foreground};
    font: ${String(Math.round(icon.glyph * icon.size))}px/1 ipa;
  }
  /* A schwa's ink sits low in its line box, so lift it to centre the ink. */
  span { transform: translateY(-18%); }
</style>
<div><span>ə</span></div>`;

const main = async () => {
  const palette = readPalette();
  const background = colour(palette, 'gb-dark0');
  const foreground = colour(palette, 'gb-bright-yellow');
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const icon of ICONS) {
      const tab = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
      await tab.setContent(page(icon, background, foreground));
      await tab.evaluate(() => document.fonts.ready);
      await tab.locator('div').screenshot({ path: `${outDir}${icon.file}`, omitBackground: true });
      await tab.close();
      console.log(`wrote public/icons/${icon.file}`);
    }
  } finally {
    await browser.close();
  }
};

await main();
