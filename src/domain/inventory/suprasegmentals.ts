import { lit } from './encoding';
import { symbolId } from './symbol-id';
import type { SuprasegmentalSymbol } from './types';

/**
 * RP suprasegmentals (SPEC §7.5). Marks have no sound of their own, so they have
 * no example word. Their name says what they mean.
 *
 * TIPA reads `""` as secondary stress, so the TIPA serialiser has to keep two
 * adjacent primary stresses apart (FR-22, ADR-0008).
 */
export const SUPRASEGMENTALS = [
  {
    id: symbolId('primary-stress'),
    ipa: 'ˈ',
    tipa: lit('"'),
    name: 'primary stress',
    inventories: ['rp', 'extended'],
    category: 'suprasegmental',
    role: 'primary-stress',
  },
  {
    id: symbolId('secondary-stress'),
    ipa: 'ˌ',
    tipa: lit('""'),
    name: 'secondary stress',
    inventories: ['rp', 'extended'],
    category: 'suprasegmental',
    role: 'secondary-stress',
  },
  {
    id: symbolId('length'),
    ipa: 'ː',
    tipa: lit(':'),
    name: 'long',
    inventories: ['rp', 'extended'],
    category: 'suprasegmental',
    role: 'long',
  },
  {
    id: symbolId('half-length'),
    ipa: 'ˑ',
    tipa: lit(';'),
    name: 'half-long',
    inventories: ['rp', 'extended'],
    category: 'suprasegmental',
    role: 'half-long',
  },
  {
    id: symbolId('syllable-break'),
    ipa: '.',
    tipa: lit('.'),
    name: 'syllable break',
    inventories: ['rp', 'extended'],
    category: 'suprasegmental',
    role: 'syllable-break',
  },
] as const satisfies readonly SuprasegmentalSymbol[];
