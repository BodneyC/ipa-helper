import type { ReactNode } from 'react';

import { ConsonantChart } from './ConsonantChart';
import { GROUPS } from './groups';
import type { Group } from './groups';
import { KeyGrid } from './KeyGrid';
import styles from './Palette.module.css';
import { VowelTrapezoid } from './VowelTrapezoid';
import { symbolsIn } from '../../../domain/inventory';
import type {
  Category,
  ConsonantSymbol,
  InventoryId,
  PhoneSymbol,
  VowelSymbol,
} from '../../../domain/inventory/types';
import { assertNever } from '../../../domain/result';
import { matchesFilter } from '../../../domain/serialise/filter';
import { labelsOf } from '../../../domain/serialise/labels';
import type { GlyphOptions } from '../../../domain/serialise/serialiser';
import { useAnnounce } from '../../components/Announcer';
import { Card } from '../../components/Card';
import { useRovingFocus } from '../../components/roving-focus';
import type { SymbolPlayer } from '../audio/use-audio';

export interface PaletteProps {
  readonly inventory: InventoryId;
  /** How symbols are drawn: r-display (Q-3) and tie bars (M6.5). */
  readonly glyphs: GlyphOptions;
  /** FR-4: the filter text; blank shows everything. */
  readonly query: string;
  /** FR-5: groups the user has collapsed. Ignored while filtering, so matches show. */
  readonly collapsedGroups: readonly Category[];
  readonly onToggleGroup: (group: Category) => void;
  /** FR-10: a key was activated. */
  readonly onActivate: (symbol: PhoneSymbol) => void;
  /** FR-30: plays symbols; left out when audio is unavailable. */
  readonly player?: SymbolPlayer | undefined;
  /** FR-2 (ADR-0016): keep a key's tooltip open while the pointer is over it. */
  readonly hoverableTooltips?: boolean | undefined;
}

const isConsonant = (s: PhoneSymbol): s is ConsonantSymbol =>
  s.category === 'consonant' || s.category === 'affricate';
const isVowel = (s: PhoneSymbol): s is VowelSymbol => s.category === 'vowel';

/**
 * FR-1, FR-3, FR-4: the symbol palette. One card per group that has symbols in
 * the chosen inventory matching the filter, in display order.
 */
export function Palette({
  inventory,
  glyphs,
  query,
  collapsedGroups,
  onToggleGroup,
  onActivate,
  player,
  hoverableTooltips = false,
}: PaletteProps) {
  const symbols = symbolsIn(inventory).filter((s) => matchesFilter(s, query, glyphs));
  const filtering = query.trim() !== '';
  const announce = useAnnounce();
  // The word display isn't focused while keys are pressed, so say what changed.
  const activate = (symbol: PhoneSymbol) => {
    onActivate(symbol);
    announce(`Added ${labelsOf(symbol, glyphs).glyph}`);
  };

  const body = (group: Group, members: readonly PhoneSymbol[]) => {
    const props = { glyphs, onActivate: activate, player, hoverableTooltips };
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
      {/* FR-4: how many symbols the filter leaves, read out as it changes. */}
      <p role="status" className={filtering ? styles['matches'] : 'visuallyHidden'}>
        {filtering && matchCount(symbols.length, query.trim())}
      </p>
      {GROUPS.map((group) => {
        const members = symbols.filter((s) => s.category === group.category);
        if (members.length === 0) return null;
        return (
          <Card
            key={group.category}
            title={group.title}
            headingLevel={3}
            accent={group.accent}
            collapse={
              filtering
                ? undefined
                : {
                    collapsed: collapsedGroups.includes(group.category),
                    onToggle: () => {
                      onToggleGroup(group.category);
                    },
                  }
            }
            className={
              group.layout === 'chart'
                ? styles['wide']
                : group.layout === 'vowels'
                  ? // The full IPA's trapezoid is wider than two columns.
                    styles[inventory === 'extended' ? 'wide' : 'double']
                  : undefined
            }
          >
            <RovingGroup>{body(group, members)}</RovingGroup>
          </Card>
        );
      })}
    </section>
  );
}

/** FR-50: each group is one Tab stop; arrow keys move between its keys. */
function RovingGroup({ children }: { readonly children: ReactNode }) {
  return <div ref={useRovingFocus<HTMLDivElement>()}>{children}</div>;
}

const matchCount = (n: number, query: string): string =>
  n === 0
    ? `No symbols match “${query}”.`
    : `${String(n)} ${n === 1 ? 'symbol matches' : 'symbols match'} “${query}”.`;
