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

/** A point on the vowel trapezoid, both axes from 0 to 1 (x: front → back, y: close → open). */
export interface TrapezoidPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * The corners of the IPA vowel trapezoid, clockwise from close front. The open
 * edge is half as wide as the close edge, as on the IPA chart.
 */
export const TRAPEZOID_OUTLINE: readonly TrapezoidPoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0.5, y: 1 },
];

/**
 * Where a height × backness sits on the trapezoid. The front edge slants, so
 * the front of an open vowel is further right than the front of a close one.
 */
export const trapezoidPoint = (height: Height, backness: Backness): TrapezoidPoint => {
  const y = HEIGHTS.indexOf(height) / (HEIGHTS.length - 1);
  const front = y / 2;
  return { x: front + (BACKNESSES.indexOf(backness) / (BACKNESSES.length - 1)) * (1 - front), y };
};

/** Vowels that share a height and backness, drawn side by side at one point. */
export interface VowelCluster extends TrapezoidPoint {
  readonly height: Height;
  readonly backness: Backness;
  /** Unrounded before rounded, short before long (FR-1). */
  readonly symbols: readonly VowelSymbol[];
}

/**
 * Lays out monophthongs on the IPA vowel trapezoid (FR-1). Clusters come in
 * reading order: close to open, then front to back.
 */
export const vowelTrapezoid = (symbols: readonly VowelSymbol[]): readonly VowelCluster[] => {
  const rank = (s: VowelSymbol) => (s.rounded ? 2 : 0) + (s.long ? 1 : 0);
  return HEIGHTS.flatMap((height) =>
    BACKNESSES.flatMap((backness) => {
      const here = symbols
        .filter((s) => s.height === height && s.backness === backness)
        .toSorted((a, b) => rank(a) - rank(b));
      return here.length === 0
        ? []
        : [{ height, backness, ...trapezoidPoint(height, backness), symbols: here }];
    }),
  );
};
