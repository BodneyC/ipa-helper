import { macro } from './encoding';
import { symbolId } from './symbol-id';
import type { OtherSymbol } from './types';

/**
 * The IPA chart's "Other symbols" that have no place × manner cell (SPEC §7.6,
 * ADR-0017), in the chart's order. w and ʍ, also listed there, sit in the
 * consonant chart's labial-velar column. ⱱ is left out: TIPA can't typeset it.
 */
export const OTHER_SYMBOLS = [
  {
    id: symbolId('turned-h'),
    ipa: 'ɥ',
    tipa: macro('textturnh'),
    name: 'voiced labial-palatal approximant',
    inventories: ['extended'],
    category: 'other',
  },
  {
    id: symbolId('small-cap-h'),
    ipa: 'ʜ',
    tipa: macro('textsch'),
    name: 'voiceless epiglottal fricative',
    inventories: ['extended'],
    category: 'other',
  },
  {
    id: symbolId('barred-reversed-glottal-stop'),
    ipa: 'ʢ',
    tipa: macro('textbarrevglotstop'),
    name: 'voiced epiglottal fricative',
    inventories: ['extended'],
    category: 'other',
  },
  {
    id: symbolId('barred-glottal-stop'),
    ipa: 'ʡ',
    tipa: macro('textbarglotstop'),
    name: 'epiglottal plosive',
    inventories: ['extended'],
    category: 'other',
  },
  {
    id: symbolId('curly-tail-c'),
    ipa: 'ɕ',
    tipa: macro('textctc'),
    name: 'voiceless alveolo-palatal fricative',
    inventories: ['extended'],
    category: 'other',
  },
  {
    id: symbolId('curly-tail-z'),
    ipa: 'ʑ',
    tipa: macro('textctz'),
    name: 'voiced alveolo-palatal fricative',
    inventories: ['extended'],
    category: 'other',
  },
  {
    id: symbolId('turned-long-leg-r'),
    ipa: 'ɺ',
    tipa: macro('textturnlonglegr'),
    name: 'voiced alveolar lateral flap',
    inventories: ['extended'],
    category: 'other',
  },
  {
    id: symbolId('hooktop-heng'),
    ipa: 'ɧ',
    tipa: macro('texththeng'),
    name: 'simultaneous ʃ and x',
    inventories: ['extended'],
    category: 'other',
  },
] as const satisfies readonly OtherSymbol[];
