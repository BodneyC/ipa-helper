import { headerLabel } from './groups';
import styles from './Palette.module.css';
import { SymbolKey } from './SymbolKey';
import { consonantChart } from '../../../domain/inventory/chart';
import type { ChartSlot } from '../../../domain/inventory/chart';
import type { ConsonantSymbol, PhoneSymbol } from '../../../domain/inventory/types';
import { labelsOf } from '../../../domain/serialise/labels';
import type { RDisplay } from '../../../domain/serialise/serialiser';

interface ConsonantChartProps {
  readonly symbols: readonly ConsonantSymbol[];
  readonly rDisplay: RDisplay;
  readonly onActivate: (symbol: PhoneSymbol) => void;
  /** FR-30: plays a symbol; left out when audio is unavailable. */
  readonly onPlay?: ((symbol: PhoneSymbol) => void) | undefined;
}

/**
 * FR-1: consonants laid out like the IPA pulmonic chart. Place across, manner
 * down; voiceless left and voiced right in each cell. Empty and impossible cells
 * look different. It's a real table, so screen readers announce the headers.
 */
export function ConsonantChart({ symbols, rDisplay, onActivate, onPlay }: ConsonantChartProps) {
  const { places, manners, rows } = consonantChart(symbols);

  const renderSlot = (slot: ChartSlot, voicing: string) => {
    switch (slot.kind) {
      case 'symbols':
        return (
          <span className={styles['slot']} data-voicing={voicing}>
            {slot.symbols.map((symbol) => (
              <SymbolKey
                key={symbol.id}
                symbol={symbol}
                labels={labelsOf(symbol, rDisplay)}
                onActivate={onActivate}
                onPlay={onPlay}
              />
            ))}
          </span>
        );
      case 'impossible':
        return (
          <span className={styles['impossible']} data-voicing={voicing}>
            <span className="visuallyHidden">{voicing}: judged impossible</span>
          </span>
        );
      case 'empty':
        return <span className={styles['empty']} data-voicing={voicing} />;
    }
  };

  return (
    <div className={styles['scroll']}>
      <table className={styles['chart']}>
        <caption className="visuallyHidden">
          Place of articulation across, manner down. In each cell, voiceless is on the left and
          voiced on the right.
        </caption>
        <thead>
          <tr>
            <td />
            {places.map((place) => (
              <th key={place} scope="col">
                {headerLabel(place)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, row) => {
            const manner = manners[row] ?? '';
            return (
              <tr key={manner}>
                <th scope="row">{headerLabel(manner)}</th>
                {cells.map((cell, col) => (
                  <td key={places[col]}>
                    <div className={styles['cell']}>
                      {renderSlot(cell.voiceless, 'voiceless')}
                      {renderSlot(cell.voiced, 'voiced')}
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
