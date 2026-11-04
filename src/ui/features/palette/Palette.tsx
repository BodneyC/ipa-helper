import { ConsonantChart } from './ConsonantChart';
import { GROUPS } from './groups';
import type { Group } from './groups';
import { KeyGrid } from './KeyGrid';
import styles from './Palette.module.css';
import { VowelTrapezoid } from './VowelTrapezoid';
import { symbolsIn } from '../../../domain/inventory';
import type {
  ConsonantSymbol,
  InventoryId,
  PhoneSymbol,
  VowelSymbol,
} from '../../../domain/inventory/types';
import { assertNever } from '../../../domain/result';
import type { RDisplay } from '../../../domain/serialise/serialiser';
import { Card } from '../../components/Card';

interface PaletteProps {
  readonly inventory: InventoryId;
  readonly rDisplay: RDisplay;
  /** FR-10: a key was activated. */
  readonly onActivate: (symbol: PhoneSymbol) => void;
}

const isConsonant = (s: PhoneSymbol): s is ConsonantSymbol =>
  s.category === 'consonant' || s.category === 'affricate';
const isVowel = (s: PhoneSymbol): s is VowelSymbol => s.category === 'vowel';

/**
 * FR-1, FR-3: the symbol palette. One card per group that has symbols in the
 * chosen inventory, in display order.
 */
export function Palette({ inventory, rDisplay, onActivate }: PaletteProps) {
  const symbols = symbolsIn(inventory);

  const body = (group: Group, members: readonly PhoneSymbol[]) => {
    const props = { rDisplay, onActivate };
    switch (group.layout) {
      case 'chart':
        return <ConsonantChart symbols={members.filter(isConsonant)} {...props} />;
      case 'vowels':
        return <VowelTrapezoid symbols={members.filter(isVowel)} {...props} />;
      case 'grid':
        return <KeyGrid symbols={members} {...props} />;
      default:
        return assertNever(group.layout);
    }
  };

  return (
    <section aria-labelledby="palette-heading" className={styles['palette']}>
      <h2 id="palette-heading" className="visuallyHidden">
        Symbols
      </h2>
      {GROUPS.map((group) => {
        const members = symbols.filter((s) => s.category === group.category);
        if (members.length === 0) return null;
        return (
          <Card
            key={group.category}
            title={group.title}
            headingLevel={3}
            accent={group.accent}
            className={
              group.layout === 'chart'
                ? styles['wide']
                : group.layout === 'vowels'
                  ? styles['double']
                  : undefined
            }
          >
            {body(group, members)}
          </Card>
        );
      })}
    </section>
  );
}
