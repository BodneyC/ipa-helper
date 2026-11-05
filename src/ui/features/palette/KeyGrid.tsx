import styles from './Palette.module.css';
import { SymbolKey } from './SymbolKey';
import type { PhoneSymbol } from '../../../domain/inventory/types';
import { labelsOf } from '../../../domain/serialise/labels';
import type { RDisplay } from '../../../domain/serialise/serialiser';

interface KeyGridProps {
  readonly symbols: readonly PhoneSymbol[];
  readonly rDisplay: RDisplay;
  readonly onActivate: (symbol: PhoneSymbol) => void;
  /** FR-30: plays a symbol; left out when audio is unavailable. */
  readonly onPlay?: ((symbol: PhoneSymbol) => void) | undefined;
}

/** A plain wrapping row of keys, for groups without a chart (FR-1). */
export function KeyGrid({ symbols, rDisplay, onActivate, onPlay }: KeyGridProps) {
  return (
    <ul className={styles['keyGrid']}>
      {symbols.map((symbol) => (
        <li key={symbol.id}>
          <SymbolKey
            symbol={symbol}
            labels={labelsOf(symbol, rDisplay)}
            onActivate={onActivate}
            onPlay={onPlay}
          />
        </li>
      ))}
    </ul>
  );
}
