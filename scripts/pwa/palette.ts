import { readFileSync } from 'node:fs';

/** `src/styles/tokens.css`: the one place hex colours live (ADR-0006). */
const TOKENS_CSS = new URL('../../src/styles/tokens.css', import.meta.url);

/** Reads the raw Gruvbox palette: `--gb-dark0` → `#282828`. */
export const parsePalette = (css: string): ReadonlyMap<string, string> =>
  new Map(
    [...css.matchAll(/--(gb-[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)].flatMap(([, name, hex]) =>
      name === undefined || hex === undefined ? [] : [[name, hex.toLowerCase()]],
    ),
  );

export const readPalette = (): ReadonlyMap<string, string> =>
  parsePalette(readFileSync(TOKENS_CSS, 'utf8'));

/** A palette colour, or an error naming the missing token. */
export const colour = (palette: ReadonlyMap<string, string>, name: string): string => {
  const hex = palette.get(name);
  if (hex === undefined) throw new Error(`tokens.css has no --${name}`);
  return hex;
};
