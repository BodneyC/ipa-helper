import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CONTRAST_PAIRS } from './contrast-pairs';

const read = (name: string) => readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8');

interface Rule {
  readonly attributes: ReadonlyMap<string, string>;
  readonly declarations: ReadonlyMap<string, string>;
}

/** Parses flat CSS rules (no nesting, no at-rules) into attribute conditions and declarations. */
const parseRules = (css: string): readonly Rule[] =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)].flatMap(
    ([, selectors = '', body = '']) => {
      const declarations = new Map(
        [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, k = '', v = '']) => [k, v.trim()]),
      );
      return selectors.split(',').map((selector) => ({
        attributes: new Map(
          [...selector.matchAll(/\[data-(\w+)='(\w+)'\]/g)].map(([, k = '', v = '']) => [k, v]),
        ),
        declarations,
      }));
    },
  );

type Rgb = readonly [r: number, g: number, b: number];

/** The raw palette from tokens.css: token name → RGB. */
const palette = new Map(
  [...read('./tokens.css').matchAll(/(--gb-[\w-]+)\s*:\s*#([0-9a-f]{6})\s*;/g)].map(
    ([, k = '', hex = '']): [string, Rgb] => {
      const channel = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16);
      return [k, [channel(0), channel(2), channel(4)]];
    },
  ),
);
const themeRules = parseRules(read('./themes.css'));

/** The palette token a semantic token resolves to on `<html data-theme data-contrast>`. */
const resolve = (token: string, state: ReadonlyMap<string, string>): string => {
  const matching = themeRules.filter((r) =>
    [...r.attributes].every(([k, v]) => state.get(k) === v),
  );
  const value = matching.findLast((r) => r.declarations.has(token))?.declarations.get(token);
  const ref = /^var\((--gb-[\w-]+)\)$/.exec(value ?? '')?.[1];
  if (ref === undefined || !palette.has(ref)) {
    throw new Error(`Cannot resolve ${token} in ${JSON.stringify([...state])}`);
  }
  return ref;
};

const rgbOf = (paletteToken: string): Rgb => palette.get(paletteToken) ?? [0, 0, 0];

/** WCAG 2.x relative luminance. */
const luminance = (rgb: Rgb): number => {
  const [r = 0, g = 0, b = 0] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2.x contrast ratio. */
const ratio = (a: Rgb, b: Rgb): number => {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

const states = ['dark', 'light'].flatMap((theme) =>
  ['soft', 'medium', 'hard'].map(
    (contrast) =>
      new Map([
        ['theme', theme],
        ['contrast', contrast],
      ]),
  ),
);

describe('theme contrast (NFR-2)', () => {
  it('computes WCAG ratios correctly', () => {
    expect(ratio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(ratio([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 2);
  });

  it('defines every semantic token in every theme × contrast', () => {
    for (const state of states) {
      for (const { fg, bg } of CONTRAST_PAIRS) {
        for (const token of [fg, ...bg]) expect(resolve(token, state)).toMatch(/^--gb-/);
      }
    }
  });

  it('FR-41: contrast changes only the page background', () => {
    const dark = new Map([['theme', 'dark']]);
    expect(resolve('--color-bg', new Map([...dark, ['contrast', 'hard']]))).toBe('--gb-dark0-hard');
    expect(resolve('--color-bg', new Map([...dark, ['contrast', 'medium']]))).toBe('--gb-dark0');
    expect(resolve('--color-bg', new Map([...dark, ['contrast', 'soft']]))).toBe('--gb-dark0-soft');
  });

  it('NFR-2: every declared pair meets its WCAG minimum in every theme × contrast', () => {
    const failures = states.flatMap((state) =>
      CONTRAST_PAIRS.flatMap(({ fg, bg, min }) =>
        bg.flatMap((b) => {
          const r = ratio(rgbOf(resolve(fg, state)), rgbOf(resolve(b, state)));
          return r >= min
            ? []
            : [
                `${[...state.values()].join('/')}: ${fg} on ${b} = ${r.toFixed(2)} < ${String(min)}`,
              ];
        }),
      ),
    );
    expect(failures).toEqual([]);
  });

  it('rejects a token no theme defines', () => {
    expect(() => resolve('--color-nope', new Map([['theme', 'dark']]))).toThrow('Cannot resolve');
  });
});
