import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SYMBOLS } from '../domain/inventory';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const fontsCss = read('./fonts.css');
const subsetScript = read('../../scripts/subset-fonts.sh');

type Range = readonly [from: number, to: number];

const parseRanges = (list: string): readonly Range[] =>
  list.split(',').map((part) => {
    const [from = '', to = from] = part.trim().replace(/^U\+/i, '').split('-');
    return [Number.parseInt(from, 16), Number.parseInt(to, 16)];
  });

/** The unicode-range of the @font-face for `family`. */
const cssRanges = (family: string): readonly Range[] => {
  const face = [...fontsCss.matchAll(/@font-face\s*\{([^}]*)\}/g)]
    .map(([, body = '']) => body)
    .find((body) => body.includes(`'${family}'`));
  const list = /unicode-range:\s*([^;]+);/.exec(face ?? '')?.[1] ?? '';
  return parseRanges(list.replace(/\s+/g, ''));
};

const scriptRanges = (name: string): readonly Range[] =>
  parseRanges(new RegExp(`^${name}="([^"]+)"`, 'm').exec(subsetScript)?.[1] ?? '');

const covers = (ranges: readonly Range[], codePoint: number) =>
  ranges.some(([from, to]) => from <= codePoint && codePoint <= to);

describe('self-hosted fonts (NFR-7)', () => {
  it('declares the same ranges the subset script builds', () => {
    expect(cssRanges('ipa-helper IPA')).toEqual(scriptRanges('ipa_ranges'));
    expect(cssRanges('JetBrains Mono')).toEqual(scriptRanges('mono_ranges'));
    expect(cssRanges('ipa-helper IPA').length).toBeGreaterThan(5);
  });

  it('covers every code point of every inventory symbol, plus slashes and the placeholder', () => {
    const ranges = cssRanges('ipa-helper IPA');
    const text = SYMBOLS.map((s) => s.ipa).join('') + '/…r';
    // Array.from iterates code points, which is what unicode-range matches.
    const missing = Array.from(text, (c) => c.codePointAt(0) ?? 0)
      .filter((cp) => !covers(ranges, cp))
      .map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
    expect(missing).toEqual([]);
  });

  it('covers all of TIPA’s output alphabet in the mono font', () => {
    const ranges = cssRanges('JetBrains Mono');
    const missing = Array.from({ length: 0x7f - 0x20 }, (_, i) => 0x20 + i).filter(
      (cp) => !covers(ranges, cp),
    );
    expect(missing).toEqual([]);
  });

  it('never uses a font name Charis SIL reserves for the modified subset (OFL §3)', () => {
    const families = [...fontsCss.matchAll(/font-family:\s*'([^']+)'/g)].map(([, f = '']) => f);
    expect(families).toEqual(['ipa-helper IPA', 'JetBrains Mono']);
  });

  it('swaps in fonts without blocking text', () => {
    expect(fontsCss.match(/font-display:\s*swap/g)).toHaveLength(2);
  });
});
