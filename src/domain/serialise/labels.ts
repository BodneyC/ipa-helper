import { assertNever } from '../result';
import { rendering } from './serialiser';
import type { RDisplay } from './serialiser';
import type { PhoneSymbol } from '../inventory/types';

/** The dotted circle a diacritic is shown on when it stands alone (ADR-0012). */
const DOTTED_CIRCLE = '\u25cc';

/** How a palette key labels its symbol (FR-2). */
export interface SymbolLabels {
  /** The glyph as a word shows it, with the r-display setting applied (Q-3). */
  readonly ipa: string;
  /**
   * The glyph on the symbol's own key: the same as `ipa`, except that a
   * diacritic sits on a dotted circle (`◌̃`), since it has no base there.
   */
  readonly glyph: string;
  /** The TIPA input for the symbol on its own, e.g. `S`, `\ae{}`, `\~{}`. */
  readonly tipa: string;
}

/** The glyph and TIPA code a key shows for `symbol`. */
export const labelsOf = (symbol: PhoneSymbol, rDisplay: RDisplay): SymbolLabels => {
  const { ipa, tipa } = rendering(symbol, rDisplay);
  const glyph = symbol.category === 'diacritic' ? DOTTED_CIRCLE + ipa : ipa;
  switch (tipa.kind) {
    case 'literal':
    case 'command':
      return { ipa, glyph, tipa: tipa.text };
    case 'macro':
    case 'wrap':
      return { ipa, glyph, tipa: `\\${tipa.name}{}` };
    default:
      return assertNever(tipa);
  }
};
