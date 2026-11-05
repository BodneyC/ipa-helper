import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parsePalette, readPalette } from './palette';
import { assertClassicScript, injectManifest, precacheManifest, webManifest } from './plugin';
import { parsePrecacheManifest } from '../../src/sw/rules';

describe('the palette (ADR-0006)', () => {
  it('reads Gruvbox tokens from CSS, lower-cased', () => {
    const palette = parsePalette(':root { --gb-dark0: #282828; --gb-light0: #FBF1C7; --x: #000; }');
    expect([...palette]).toEqual([
      ['gb-dark0', '#282828'],
      ['gb-light0', '#fbf1c7'],
    ]);
  });

  it('reads the real tokens.css', () => {
    expect(readPalette().get('gb-dark0')).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('webManifest (FR-60)', () => {
  it('uses relative URLs, so it works under any base path, and the theme colour', () => {
    const manifest = webManifest(new Map([['gb-dark0', '#282828']]));
    expect(manifest).toMatchObject({
      start_url: './',
      scope: './',
      display: 'standalone',
      theme_color: '#282828',
      background_color: '#282828',
    });
    expect(manifest.icons.map((icon) => icon.src)).toEqual([
      'icons/icon-192.png',
      'icons/icon-512.png',
      'icons/icon-maskable-512.png',
    ]);
  });

  it('fails loudly if the palette lacks its colour', () => {
    expect(() => webManifest(new Map())).toThrow('tokens.css has no --gb-dark0');
  });
});

describe('precacheManifest (FR-61)', () => {
  const dist = () => {
    const dir = mkdtempSync(join(tmpdir(), 'pwa-'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'index.html'), '<html>');
    writeFileSync(join(dir, 'assets', 'index-a.js'), 'app');
    writeFileSync(join(dir, 'assets', 'schwa-b.opus'), 'clip');
    return dir;
  };

  it('lists the shell files and versions them by content', () => {
    const dir = dist();
    const before = precacheManifest(dir);
    expect(before.paths).toEqual(['assets/index-a.js', 'index.html']);
    expect(before.version).toMatch(/^[0-9a-f]{12}$/);
    writeFileSync(join(dir, 'assets', 'schwa-b.opus'), 'other clip');
    expect(precacheManifest(dir).version).toBe(before.version);
    writeFileSync(join(dir, 'index.html'), '<html lang="en">');
    expect(precacheManifest(dir).version).not.toBe(before.version);
  });
});

describe('injectManifest', () => {
  const manifest = { version: 'v1', paths: ['index.html', 'a "quoted" path'] };

  it.each([`'`, `"`, '`'])(
    'replaces the placeholder quoted with %s by a parseable literal',
    (q) => {
      const source = `const m = parse(${q}__IPA_HELPER_PRECACHE_MANIFEST__${q});`;
      const injected = injectManifest(source, manifest);
      const literal = /parse\((.*)\);/.exec(injected)?.[1] ?? '';
      const json: unknown = JSON.parse(literal);
      expect(typeof json === 'string' ? parsePrecacheManifest(json) : undefined).toEqual(manifest);
    },
  );

  it('fails the build when the placeholder is missing', () => {
    expect(() => injectManifest('const m = 1;', manifest)).toThrow('no manifest placeholder');
  });
});

describe('assertClassicScript', () => {
  it('accepts a bundle with no module syntax', () => {
    expect(() => {
      assertClassicScript('var a=1;self.addEventListener(`fetch`,()=>{});');
    }).not.toThrow();
  });

  it.each(['import{a}from"./assets/rules.js";a();', 'var a=1;\nexport{a};'])(
    'rejects %s',
    (source) => {
      expect(() => {
        assertClassicScript(source);
      }).toThrow('classic script');
    },
  );
});
