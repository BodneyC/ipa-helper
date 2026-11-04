import { describe, expect, expectTypeOf, it } from 'vitest';

import { assertNever } from '../result';
import { symbolId } from './symbol-id';
import {
  BACKNESSES,
  CATEGORIES,
  GLIDES,
  HEIGHTS,
  INVENTORY_IDS,
  MANNERS,
  PLACES,
  SECONDARY_ARTICULATIONS,
  SUPRASEGMENTAL_ROLES,
} from './types';
import type {
  Backness,
  Category,
  ConsonantSymbol,
  DiacriticSymbol,
  DiphthongSymbol,
  Example,
  Glide,
  Height,
  InventoryId,
  Manner,
  PhoneSymbol,
  Place,
  SecondaryArticulation,
  SuprasegmentalRole,
  SuprasegmentalSymbol,
  TipaEncoding,
  VowelSymbol,
} from './types';

/** One fixture per variant, checked with `satisfies` as the M1.2 data will be. */
const fixtures = [
  {
    id: symbolId('esh'),
    ipa: 'ʃ',
    tipa: { kind: 'literal', text: 'S' },
    name: 'voiceless postalveolar fricative',
    inventories: ['rp', 'extended'],
    example: { word: 'ship', highlight: [0, 2] },
    category: 'consonant',
    place: 'postalveolar',
    manner: 'fricative',
    voiced: false,
  },
  {
    id: symbolId('dark-l'),
    ipa: 'ɫ',
    tipa: { kind: 'macro', name: 'textltilde' },
    name: 'velarised alveolar lateral approximant',
    inventories: ['rp'],
    category: 'consonant',
    place: 'alveolar',
    manner: 'lateral-approximant',
    voiced: true,
    secondary: 'velarised',
  },
  {
    id: symbolId('tesh'),
    ipa: 'tʃ',
    tipa: { kind: 'literal', text: 'tS' },
    name: 'voiceless postalveolar affricate',
    inventories: ['rp'],
    category: 'affricate',
    place: 'postalveolar',
    manner: 'affricate',
    voiced: false,
  },
  {
    id: symbolId('i-long'),
    ipa: 'iː',
    tipa: { kind: 'literal', text: 'i:' },
    name: 'long close front unrounded vowel',
    inventories: ['rp'],
    category: 'vowel',
    height: 'close',
    backness: 'front',
    rounded: false,
    long: true,
  },
  {
    id: symbolId('e-i'),
    ipa: 'eɪ',
    tipa: { kind: 'literal', text: 'eI' },
    name: 'closing diphthong',
    inventories: ['rp'],
    category: 'diphthong',
    glide: 'closing',
  },
  {
    id: symbolId('primary-stress'),
    ipa: 'ˈ',
    tipa: { kind: 'literal', text: '"' },
    name: 'primary stress',
    inventories: ['rp'],
    category: 'suprasegmental',
    role: 'primary-stress',
  },
  {
    id: symbolId('tilde'),
    ipa: '̃',
    tipa: { kind: 'wrap', name: '~' },
    name: 'nasalised',
    inventories: ['extended'],
    category: 'diacritic',
  },
] as const satisfies readonly PhoneSymbol[];

/** Summarises a symbol by narrowing on `category`; it must compile exhaustively. */
const placement = (symbol: PhoneSymbol): string => {
  switch (symbol.category) {
    case 'consonant':
    case 'affricate':
      return `${symbol.place} ${symbol.manner}`;
    case 'vowel':
      return `${symbol.height} ${symbol.backness}`;
    case 'diphthong':
      return symbol.glide;
    case 'suprasegmental':
      return symbol.role;
    case 'diacritic':
      return 'diacritic';
    default:
      return assertNever(symbol);
  }
};

const renderTipa = (encoding: TipaEncoding): string => {
  switch (encoding.kind) {
    case 'literal':
      return encoding.text;
    case 'macro':
      return `\\${encoding.name}{}`;
    case 'wrap':
      return `\\${encoding.name}{…}`;
    default:
      return assertNever(encoding);
  }
};

describe('inventory types', () => {
  it('has a fixture for every category, discriminated by `category`', () => {
    expect(new Set(fixtures.map((s) => s.category))).toEqual(new Set(CATEGORIES));
    expect(fixtures.map(placement)).toEqual([
      'postalveolar fricative',
      'alveolar lateral-approximant',
      'postalveolar affricate',
      'close front',
      'closing',
      'primary-stress',
      'diacritic',
    ]);
  });

  it('distinguishes the three TIPA encoding kinds', () => {
    expect(fixtures.map((s) => renderTipa(s.tipa))).toEqual([
      'S',
      '\\textltilde{}',
      'tS',
      'i:',
      'eI',
      '"',
      '\\~{…}',
    ]);
  });

  it('keeps every feature vocabulary free of duplicates', () => {
    const vocabularies: readonly (readonly string[])[] = [
      PLACES,
      MANNERS,
      SECONDARY_ARTICULATIONS,
      HEIGHTS,
      BACKNESSES,
      CATEGORIES,
      INVENTORY_IDS,
      SUPRASEGMENTAL_ROLES,
      GLIDES,
    ];
    for (const vocabulary of vocabularies) expect(new Set(vocabulary).size).toBe(vocabulary.length);
  });

  it('orders chart axes as the IPA chart does', () => {
    expect(PLACES[0]).toBe('bilabial');
    expect(PLACES.at(-1)).toBe('glottal');
    expect(MANNERS[0]).toBe('plosive');
    expect(HEIGHTS[0]).toBe('close');
    expect(HEIGHTS.at(-1)).toBe('open');
    expect(BACKNESSES[0]).toBe('front');
    expect(BACKNESSES.at(-1)).toBe('back');
  });

  it('derives each feature type from its runtime vocabulary', () => {
    expectTypeOf<Place>().toEqualTypeOf<(typeof PLACES)[number]>();
    expectTypeOf<Manner>().toEqualTypeOf<(typeof MANNERS)[number]>();
    expectTypeOf<SecondaryArticulation>().toEqualTypeOf<(typeof SECONDARY_ARTICULATIONS)[number]>();
    expectTypeOf<Height>().toEqualTypeOf<(typeof HEIGHTS)[number]>();
    expectTypeOf<Backness>().toEqualTypeOf<(typeof BACKNESSES)[number]>();
    expectTypeOf<InventoryId>().toEqualTypeOf<(typeof INVENTORY_IDS)[number]>();
    expectTypeOf<SuprasegmentalRole>().toEqualTypeOf<(typeof SUPRASEGMENTAL_ROLES)[number]>();
    expectTypeOf<Glide>().toEqualTypeOf<(typeof GLIDES)[number]>();
    expectTypeOf<Category>().toEqualTypeOf<(typeof CATEGORIES)[number]>();
    expect(fixtures[0].example satisfies Example).toEqual({ word: 'ship', highlight: [0, 2] });
  });

  it('narrows PhoneSymbol to one variant per category', () => {
    // Consonants and affricates share a variant, so narrow on both together.
    type Narrow<C extends Category> = Extract<PhoneSymbol, { readonly category: C }>;
    expectTypeOf<Narrow<'consonant' | 'affricate'>>().toEqualTypeOf<ConsonantSymbol>();
    expectTypeOf<Narrow<'vowel'>>().toEqualTypeOf<VowelSymbol>();
    expectTypeOf<Narrow<'diphthong'>>().toEqualTypeOf<DiphthongSymbol>();
    expectTypeOf<Narrow<'suprasegmental'>>().toEqualTypeOf<SuprasegmentalSymbol>();
    expectTypeOf<Narrow<'diacritic'>>().toEqualTypeOf<DiacriticSymbol>();
    expect(fixtures).toHaveLength(CATEGORIES.length + 1);
  });

  it('rejects malformed symbols at compile time', () => {
    expectTypeOf<Category>().toEqualTypeOf<PhoneSymbol['category']>();

    const vowelWithPlace = {
      id: symbolId('schwa'),
      ipa: 'ə',
      tipa: { kind: 'literal', text: '@' },
      name: 'mid central vowel',
      inventories: ['rp'],
      category: 'vowel',
      height: 'mid',
      backness: 'central',
      rounded: false,
      long: false,
      // @ts-expect-error: vowels have no place of articulation.
      place: 'velar',
    } satisfies PhoneSymbol;
    expect(vowelWithPlace.category).toBe('vowel');

    const rawId = {
      // @ts-expect-error: IDs must be branded through symbolId/parseSymbolId.
      id: 'schwa',
      ipa: 'ə',
      tipa: { kind: 'literal', text: '@' },
      name: 'mid central vowel',
      inventories: ['rp'],
      category: 'diphthong',
      glide: 'centring',
    } satisfies PhoneSymbol;
    expect(rawId.id).toBe('schwa');

    // @ts-expect-error: a literal encoding carries `text`, not `name`.
    const badEncoding: TipaEncoding = { kind: 'literal', name: 'S' };
    expect(badEncoding.kind).toBe('literal');
  });
});
