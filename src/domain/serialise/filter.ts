import { labelsOf } from './labels';
import type { GlyphOptions } from './serialiser';
import type { PhoneSymbol } from '../inventory/types';

const words = (text: string): readonly string[] =>
  text
    .toLowerCase()
    .split(/[\s-]+/)
    .filter((w) => w.length > 0);

/**
 * FR-4: does `symbol` match the filter `query`? A symbol matches when any of:
 * - its glyph (as displayed, Q-3), with or without a tie bar (M6.5), contains the query;
 * - its TIPA code contains the query, case-sensitively (`S` finds `ʃ`, `s` finds `s`);
 * - every word of the query starts some word of its name or example word,
 *   ignoring case (`fric`, `voiceless fric`, `close-mid`, `ship`).
 *
 * An empty or blank query matches everything.
 */
export const matchesFilter = (
  symbol: PhoneSymbol,
  query: string,
  glyphs: GlyphOptions,
): boolean => {
  const q = query.trim();
  if (q === '') return true;
  const { ipa, tipa } = labelsOf(symbol, glyphs);
  if (ipa.includes(q) || ipa.replaceAll('\u0361', '').includes(q) || tipa.includes(q)) return true;
  const haystack = words(`${symbol.name} ${symbol.example?.word ?? ''}`);
  return words(q).every((w) => haystack.some((h) => h.startsWith(w)));
};
