import { BACKNESSES, HEIGHTS, MANNERS, PLACES } from './types';
import type { Backness, ConsonantSymbol, Height, Manner, Place, VowelSymbol } from './types';

/**
 * Articulations the IPA chart shades as judged impossible (FR-1). Plosives are
 * shaded only on the voiced side at the pharynx and glottis.
 */
const IMPOSSIBLE: ReadonlyMap<Manner, readonly Place[]> = new Map<Manner, readonly Place[]>([
  ['nasal', ['pharyngeal', 'glottal']],
  ['trill', ['velar', 'glottal']],
  ['tap', ['velar', 'glottal']],
  ['lateral-fricative', ['bilabial', 'labiodental', 'pharyngeal', 'glottal']],
  ['lateral-approximant', ['bilabial', 'labiodental', 'pharyngeal', 'glottal']],
]);
const IMPOSSIBLE_VOICED_PLOSIVES: readonly Place[] = ['pharyngeal', 'glottal'];

/** True when the IPA chart shades this place × manner × voicing as impossible. */
export const isImpossible = (place: Place, manner: Manner, voiced: boolean): boolean =>
  (IMPOSSIBLE.get(manner)?.includes(place) ?? false) ||
  (manner === 'plosive' && voiced && IMPOSSIBLE_VOICED_PLOSIVES.includes(place));

/** One voicing half of a chart cell. */
export type ChartSlot =
  | { readonly kind: 'symbols'; readonly symbols: readonly ConsonantSymbol[] }
  | { readonly kind: 'empty' }
  | { readonly kind: 'impossible' };

/** A place × manner cell: voiceless on the left, voiced on the right (FR-1). */
interface ChartCell {
  readonly voiceless: ChartSlot;
  readonly voiced: ChartSlot;
}

/** A consonant chart (FR-1): only the columns and rows the symbols use, in IPA order. */
export interface ConsonantChart {
  readonly places: readonly Place[];
  readonly manners: readonly Manner[];
  /** Rows of cells, one row per manner, one cell per place. */
  readonly rows: readonly (readonly ChartCell[])[];
}

/** Lays out consonants as the IPA pulmonic chart does (FR-1). */
export const consonantChart = (symbols: readonly ConsonantSymbol[]): ConsonantChart => {
  const places = PLACES.filter((p) => symbols.some((s) => s.place === p));
  const manners = MANNERS.filter((m) => symbols.some((s) => s.manner === m));
  const slot = (place: Place, manner: Manner, voiced: boolean): ChartSlot => {
    const here = symbols.filter(
      (s) => s.place === place && s.manner === manner && s.voiced === voiced,
    );
    if (here.length > 0) return { kind: 'symbols', symbols: here };
    return isImpossible(place, manner, voiced) ? { kind: 'impossible' } : { kind: 'empty' };
  };
  return {
    places,
    manners,
    rows: manners.map((manner) =>
      places.map((place) => ({
        voiceless: slot(place, manner, false),
        voiced: slot(place, manner, true),
      })),
    ),
  };
};

/** The three columns of the simplified vowel grid. */
type VowelColumn = 'front' | 'central' | 'back';
const VOWEL_COLUMNS: readonly VowelColumn[] = ['front', 'central', 'back'];
const columnOf = (backness: Backness): VowelColumn =>
  backness === 'central' ? 'central' : BACKNESSES.indexOf(backness) < 2 ? 'front' : 'back';

/** A simplified vowel chart: heights × front/central/back (M2.5; M3.1 adds the trapezoid). */
export interface VowelGrid {
  readonly heights: readonly Height[];
  readonly columns: readonly VowelColumn[];
  /** Rows of cells, one row per height. A cell lists unrounded before rounded, short before long. */
  readonly rows: readonly (readonly (readonly VowelSymbol[])[])[];
}

/** Lays out monophthongs by height and frontness, pairing rounding and length (FR-1). */
export const vowelGrid = (symbols: readonly VowelSymbol[]): VowelGrid => {
  const heights = HEIGHTS.filter((h) => symbols.some((s) => s.height === h));
  const rank = (s: VowelSymbol) => (s.rounded ? 2 : 0) + (s.long ? 1 : 0);
  return {
    heights,
    columns: VOWEL_COLUMNS,
    rows: heights.map((height) =>
      VOWEL_COLUMNS.map((column) =>
        symbols
          .filter((s) => s.height === height && columnOf(s.backness) === column)
          .toSorted((a, b) => rank(a) - rank(b)),
      ),
    ),
  };
};
