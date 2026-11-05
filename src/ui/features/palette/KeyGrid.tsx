import styles from './Palette.module.css';
import { SymbolKey } from './SymbolKey';
import type { PhoneSymbol } from '../../../domain/inventory/types';
import { labelsOf } from '../../../domain/serialise/labels';
import type { GlyphOptions } from '../../../domain/serialise/serialiser';
import type { SymbolPlayer } from '../audio/use-audio';

interface KeyGridProps {
  readonly symbols: readonly PhoneSymbol[];
  readonly glyphs: GlyphOptions;
  readonly onActivate: (symbol: PhoneSymbol) => void;
  /** FR-30: plays symbols; left out when audio is unavailable. */
  readonly player?: SymbolPlayer | undefined;
}

/** A plain wrapping row of keys, for groups without a chart (FR-1). */
export function KeyGrid({ symbols, glyphs, onActivate, player }: KeyGridProps) {
  return (
    <ul className={styles['keyGrid']}>
      {symbols.map((symbol) => (
        <li key={symbol.id}>
          <SymbolKey
            symbol={symbol}
            labels={labelsOf(symbol, glyphs)}
            onActivate={onActivate}
            player={player}
          />
        </li>
      ))}
    </ul>
  );
}
