import { headerLabel } from './groups';
import styles from './Palette.module.css';
import { SymbolKey } from './SymbolKey';
import { vowelGrid } from '../../../domain/inventory/chart';
import type { PhoneSymbol, VowelSymbol } from '../../../domain/inventory/types';
import { labelsOf } from '../../../domain/serialise/labels';
import type { RDisplay } from '../../../domain/serialise/serialiser';

interface VowelGridProps {
  readonly symbols: readonly VowelSymbol[];
  readonly rDisplay: RDisplay;
  readonly onActivate: (symbol: PhoneSymbol) => void;
}

/**
 * FR-1 (interim): monophthongs by height (rows) and front/central/back (columns),
 * with rounding pairs and long variants side by side. M3.1 replaces it with the
 * vowel trapezoid.
 */
export function VowelGrid({ symbols, rDisplay, onActivate }: VowelGridProps) {
  const { heights, columns, rows } = vowelGrid(symbols);
  return (
    <div className={styles['scroll']}>
      <table className={styles['chart']}>
        <caption className="visuallyHidden">
          Height down, from close to open; front, central and back across.
        </caption>
        <thead>
          <tr>
            <td />
            {columns.map((column) => (
              <th key={column} scope="col">
                {headerLabel(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, row) => {
            const height = heights[row] ?? '';
            return (
              <tr key={height}>
                <th scope="row">{headerLabel(height)}</th>
                {cells.map((vowels, col) => (
                  <td key={columns[col]}>
                    <div className={styles['cell']}>
                      {vowels.map((symbol) => (
                        <SymbolKey
                          key={symbol.id}
                          symbol={symbol}
                          labels={labelsOf(symbol, rDisplay)}
                          onActivate={onActivate}
                        />
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
