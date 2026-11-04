import type { SymbolId } from './symbol-id';

/**
 * Places of articulation, in IPA chart column order (left to right). The
 * consonant chart lays out its columns in this order.
 */
export const PLACES = [
  'bilabial',
  'labiodental',
  'dental',
  'alveolar',
  'postalveolar',
  'retroflex',
  'palatal',
  'labial-velar',
  'velar',
  'uvular',
  'pharyngeal',
  'glottal',
] as const;
/** A place of articulation. */
export type Place = (typeof PLACES)[number];

/**
 * Manners of articulation, in IPA chart row order (top to bottom). `affricate`
 * isn't a row in the IPA chart, but RP treats `tʃ` and `dʒ` as single phonemes.
 */
export const MANNERS = [
  'plosive',
  'nasal',
  'trill',
  'tap',
  'fricative',
  'lateral-fricative',
  'affricate',
  'approximant',
  'lateral-approximant',
] as const;
/** A manner of articulation. */
export type Manner = (typeof MANNERS)[number];

/**
 * Secondary articulations that set a consonant apart from the plain one in the
 * same chart cell, e.g. dark `ɫ` is a velarised `l`.
 */
export const SECONDARY_ARTICULATIONS = [
  'labialised',
  'palatalised',
  'velarised',
  'pharyngealised',
] as const;
/** A secondary articulation. */
export type SecondaryArticulation = (typeof SECONDARY_ARTICULATIONS)[number];

/** Vowel heights, close to open (the vowel trapezoid's rows, top to bottom). */
export const HEIGHTS = [
  'close',
  'near-close',
  'close-mid',
  'mid',
  'open-mid',
  'near-open',
  'open',
] as const;
/** A vowel height. */
export type Height = (typeof HEIGHTS)[number];

/** Vowel backness, front to back (the vowel trapezoid's columns, left to right). */
export const BACKNESSES = ['front', 'near-front', 'central', 'near-back', 'back'] as const;
/** A vowel backness. */
export type Backness = (typeof BACKNESSES)[number];

/** The kinds of symbol. Each one is a variant of {@link PhoneSymbol}. */
export const CATEGORIES = [
  'consonant',
  'affricate',
  'vowel',
  'diphthong',
  'suprasegmental',
  'diacritic',
] as const;
/** A symbol category. */
export type Category = (typeof CATEGORIES)[number];

/** Symbol sets the user can switch between (FR-3). `extended` is filled in during M6. */
export const INVENTORY_IDS = ['rp', 'extended'] as const;
/** An inventory identifier. */
export type InventoryId = (typeof INVENTORY_IDS)[number];

/** What a suprasegmental mark means (SPEC §7.5). */
export const SUPRASEGMENTAL_ROLES = [
  'primary-stress',
  'secondary-stress',
  'long',
  'half-long',
  'syllable-break',
] as const;
/** A suprasegmental role. */
export type SuprasegmentalRole = (typeof SUPRASEGMENTAL_ROLES)[number];

/**
 * Direction of a diphthong's glide. RP closing diphthongs end in `ɪ` or `ʊ`, and
 * centring diphthongs end in `ə` (SPEC §7.4).
 */
export const GLIDES = ['closing', 'centring'] as const;
/** A diphthong glide direction. */
export type Glide = (typeof GLIDES)[number];

/** An example word with the letters that spell the sound highlighted. */
export interface Example {
  /** The example word, e.g. `"ship"`. */
  readonly word: string;
  /** Half-open UTF-16 range `[start, end)` into `word`, e.g. `[0, 2]` for "sh". */
  readonly highlight: readonly [start: number, end: number];
}

/**
 * How a symbol is written in TIPA (ADR-0008). Serialisers add the boundary
 * safety (`{}`); the encoding holds only the bare text or macro name.
 */
export type TipaEncoding =
  /** Plain TIPA input characters, e.g. `"S"`, `"tS"`, `"i:"`. */
  | { readonly kind: 'literal'; readonly text: string }
  /** A control word without its backslash, e.g. `"textturnr"` → `\textturnr{}`. */
  | { readonly kind: 'macro'; readonly name: string }
  /** A diacritic macro that wraps the preceding symbol, e.g. `"~"` → `\~{…}`. */
  | { readonly kind: 'wrap'; readonly name: string };

/** Fields every symbol has, whatever its category. */
interface BaseSymbol {
  /** Stable ASCII identifier, used in URLs (ADR-0007). */
  readonly id: SymbolId;
  /** The IPA text, NFC-normalised. It may be several code points (`tʃ`, `iː`). */
  readonly ipa: string;
  /** The TIPA encoding. */
  readonly tipa: TipaEncoding;
  /** Descriptive name, e.g. `"voiceless postalveolar fricative"`. */
  readonly name: string;
  /** The inventories that include this symbol. */
  readonly inventories: readonly InventoryId[];
  /** An example word. Every RP symbol has one, except suprasegmentals and diacritics. */
  readonly example?: Example;
  /** Lookup key for the symbol's audio clip (M4). */
  readonly audioKey?: string;
}

/** A consonant or affricate, placed in the consonant chart by place × manner × voicing. */
export interface ConsonantSymbol extends BaseSymbol {
  readonly category: 'consonant' | 'affricate';
  readonly place: Place;
  readonly manner: Manner;
  readonly voiced: boolean;
  /** Present only when it sets the symbol apart from a plain consonant in the same cell. */
  readonly secondary?: SecondaryArticulation;
}

/** A monophthong, placed in the vowel trapezoid by height × backness. */
export interface VowelSymbol extends BaseSymbol {
  readonly category: 'vowel';
  readonly height: Height;
  readonly backness: Backness;
  readonly rounded: boolean;
  /** True when the symbol includes the length mark, e.g. `iː`. */
  readonly long: boolean;
}

/** A diphthong, e.g. `eɪ`. */
export interface DiphthongSymbol extends BaseSymbol {
  readonly category: 'diphthong';
  readonly glide: Glide;
}

/** A stress, length or syllable-boundary mark. */
export interface SuprasegmentalSymbol extends BaseSymbol {
  readonly category: 'suprasegmental';
  readonly role: SuprasegmentalRole;
}

/** A diacritic (M6). Serialisers attach it to the preceding base token. */
export interface DiacriticSymbol extends BaseSymbol {
  readonly category: 'diacritic';
}

/** Any symbol in an inventory. Narrow on `category`. */
export type PhoneSymbol =
  ConsonantSymbol | VowelSymbol | DiphthongSymbol | SuprasegmentalSymbol | DiacriticSymbol;
