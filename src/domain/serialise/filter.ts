import { labelsOf } from './labels';
import type { RDisplay } from './serialiser';
import type { PhoneSymbol } from '../inventory/types';

const words = (text: string): readonly string[] =>
  text
    .toLowerCase()
    .split(/[\s-]+/)
    .filter((w) => w.length > 0);

/**
 * FR-4: does `symbol` match the filter `query`? A symbol matches when any of:
 * - its glyph (as displayed, Q-3) contains the query;
 * - its TIPA code contains the query, case-sensitively (`S` finds `ʃ`, `s` finds `s`);
 * - every word of the query starts some word of its name or example word,
 *   ignoring case (`fric`, `voiceless fric`, `close-mid`, `ship`).
 *
 * An empty or blank query matches everything.
 */
export const matchesFilter = (symbol: PhoneSymbol, query: string, rDisplay: RDisplay): boolean => {
  const q = query.trim();
  if (q === '') return true;
  const { ipa, tipa } = labelsOf(symbol, rDisplay);
  if (ipa.includes(q) || tipa.includes(q)) return true;
  const haystack = words(`${symbol.name} ${symbol.example?.word ?? ''}`);
  return words(q).every((w) => haystack.some((h) => h.startsWith(w)));
};
