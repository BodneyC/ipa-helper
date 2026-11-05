import { useId } from 'react';

import { headerLabel } from './groups';
import styles from './Palette.module.css';
import { SymbolKey } from './SymbolKey';
import { TRAPEZOID_OUTLINE, trapezoidPoint, vowelTrapezoid } from '../../../domain/inventory/chart';
import type { PhoneSymbol, VowelSymbol } from '../../../domain/inventory/types';
import { labelsOf } from '../../../domain/serialise/labels';
import type { RDisplay } from '../../../domain/serialise/serialiser';
import type { SymbolPlayer } from '../audio/use-audio';

interface VowelTrapezoidProps {
  readonly symbols: readonly VowelSymbol[];
  readonly rDisplay: RDisplay;
  readonly onActivate: (symbol: PhoneSymbol) => void;
  /** FR-30: plays symbols; left out when audio is unavailable. */
  readonly player?: SymbolPlayer | undefined;
}

const percent = (n: number) => `${String(n * 100)}%`;
const svgPoints = TRAPEZOID_OUTLINE.map(({ x, y }) => `${String(x * 100)},${String(y * 100)}`).join(
  ' ',
);
/** The chart's guide lines: close-mid and open-mid across, central down. */
const GUIDES = [
  [trapezoidPoint('close-mid', 'front'), trapezoidPoint('close-mid', 'back')],
  [trapezoidPoint('open-mid', 'front'), trapezoidPoint('open-mid', 'back')],
  [trapezoidPoint('close', 'central'), trapezoidPoint('open', 'central')],
] as const;
const COLUMN_LABELS = (['front', 'central', 'back'] as const).map((backness) => ({
  backness,
  x: trapezoidPoint('close', backness).x,
}));

/**
 * FR-1: monophthongs on the IPA vowel trapezoid, with rounding pairs and long
 * variants side by side. The outline is an SVG stretched to the container; the
 * keys are positioned over it in percentages, so the chart scales with its card
 * (down to a minimum width, below which it scrolls like the consonant chart).
 * Keys are in reading order (close to open, front to back) for keyboard users,
 * and each key's name says where it sits.
 */
export function VowelTrapezoid({ symbols, rDisplay, onActivate, player }: VowelTrapezoidProps) {
  const captionId = useId();
  const clusters = vowelTrapezoid(symbols);
  // The full IPA puts three vowels at some points (i iː y); the chart widens to fit.
  const widest = Math.max(0, ...clusters.map((c) => c.symbols.length));
  return (
    <div className={styles['scroll']}>
      <figure
        className={styles['trapezoid']}
        aria-labelledby={captionId}
        data-widest={widest > 2 ? 'wide' : undefined}
      >
        <figcaption id={captionId} className="visuallyHidden">
          Vowel chart: close vowels at the top, open at the bottom; front on the left, back on the
          right.
        </figcaption>
        <div className={styles['plot']}>
          <svg
            className={styles['outline']}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <polygon points={svgPoints} />
            {GUIDES.map(([from, to]) => (
              <line
                key={`${String(from.x)},${String(from.y)}`}
                x1={from.x * 100}
                y1={from.y * 100}
                x2={to.x * 100}
                y2={to.y * 100}
              />
            ))}
          </svg>
          {COLUMN_LABELS.map(({ backness, x }) => (
            <span
              key={backness}
              className={styles['axisLabel']}
              style={{ left: percent(x) }}
              aria-hidden="true"
            >
              {headerLabel(backness)}
            </span>
          ))}
          <ul className={styles['clusters']}>
            {clusters.map((cluster) => (
              <li
                key={`${cluster.height} ${cluster.backness}`}
                className={styles['cluster']}
                style={{ left: percent(cluster.x), top: percent(cluster.y) }}
              >
                {cluster.symbols.map((symbol) => (
                  <SymbolKey
                    key={symbol.id}
                    symbol={symbol}
                    labels={labelsOf(symbol, rDisplay)}
                    onActivate={onActivate}
                    player={player}
                  />
                ))}
              </li>
            ))}
          </ul>
        </div>
      </figure>
    </div>
  );
}
