import { assertNever } from '../result';
import { rendering } from './serialiser';
import type { RDisplay } from './serialiser';
import type { PhoneSymbol } from '../inventory/types';

/** How a palette key labels its symbol (FR-2). */
export interface SymbolLabels {
  /** The glyph, with the r-display setting applied (Q-3). */
  readonly ipa: string;
  /** The TIPA input for the symbol on its own, e.g. `S`, `\ae{}`, `\~{}`. */
  readonly tipa: string;
}

/** The glyph and TIPA code a key shows for `symbol`. */
export const labelsOf = (symbol: PhoneSymbol, rDisplay: RDisplay): SymbolLabels => {
  const { ipa, tipa } = rendering(symbol, rDisplay);
  switch (tipa.kind) {
    case 'literal':
      return { ipa, tipa: tipa.text };
    case 'macro':
    case 'wrap':
      return { ipa, tipa: `\\${tipa.name}{}` };
    default:
      return assertNever(tipa);
  }
};
