import { lit } from './encoding';
import { example } from './example';
import { symbolId } from './symbol-id';
import type { DiphthongSymbol } from './types';

/**
 * RP diphthongs (SPEC §7.4). IDs are Wells lexical-set keywords, which is how
 * British phonetics names these vowels and which reads well in a URL.
 */
export const DIPHTHONGS = [
  {
    id: symbolId('face'),
    ipa: 'eɪ',
    tipa: lit('eI'),
    name: 'FACE diphthong',
    inventories: ['rp', 'extended'],
    example: example('f**a**ce'),
    category: 'diphthong',
    glide: 'closing',
  },
  {
    id: symbolId('price'),
    ipa: 'aɪ',
    tipa: lit('aI'),
    name: 'PRICE diphthong',
    inventories: ['rp', 'extended'],
    example: example('pr**i**ce'),
    category: 'diphthong',
    glide: 'closing',
  },
  {
    id: symbolId('choice'),
    ipa: 'ɔɪ',
    tipa: lit('OI'),
    name: 'CHOICE diphthong',
    inventories: ['rp', 'extended'],
    example: example('ch**oi**ce'),
    category: 'diphthong',
    glide: 'closing',
  },
  {
    id: symbolId('goat'),
    ipa: 'əʊ',
    tipa: lit('@U'),
    name: 'GOAT diphthong',
    inventories: ['rp', 'extended'],
    example: example('g**oa**t'),
    category: 'diphthong',
    glide: 'closing',
  },
  {
    id: symbolId('mouth'),
    ipa: 'aʊ',
    tipa: lit('aU'),
    name: 'MOUTH diphthong',
    inventories: ['rp', 'extended'],
    example: example('m**ou**th'),
    category: 'diphthong',
    glide: 'closing',
  },
  {
    id: symbolId('near'),
    ipa: 'ɪə',
    tipa: lit('I@'),
    name: 'NEAR diphthong',
    inventories: ['rp', 'extended'],
    example: example('n**ea**r'),
    category: 'diphthong',
    glide: 'centring',
  },
  {
    id: symbolId('square'),
    ipa: 'eə',
    tipa: lit('e@'),
    name: 'SQUARE diphthong',
    inventories: ['rp', 'extended'],
    example: example('squ**a**re'),
    category: 'diphthong',
    glide: 'centring',
  },
  {
    id: symbolId('cure'),
    ipa: 'ʊə',
    tipa: lit('U@'),
    name: 'CURE diphthong',
    inventories: ['rp', 'extended'],
    example: example('c**u**re'),
    category: 'diphthong',
    glide: 'centring',
  },
] as const satisfies readonly DiphthongSymbol[];
