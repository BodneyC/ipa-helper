import { command, lit, macro, wrap } from './encoding';
import { symbolId } from './symbol-id';
import type { DiacriticSymbol } from './types';

/**
 * IPA diacritics (FR-1, SPEC §7.6), in the `extended` inventory only, in the
 * IPA chart's order. Each is a token of its own that follows its base
 * (ARCHITECTURE §4, ADR-0012):
 *
 * - combining marks (written here as escapes, since they don't show on their
 *   own) wrap the preceding token in TIPA: `\textsubring{n}`;
 * - spacing modifiers (ʰ ʷ ʲ ˠ ˤ ⁿ ˡ ˞ ʼ) simply follow it: `t\super{h}`.
 */
export const DIACRITICS = [
  {
    id: symbolId('voiceless'),
    ipa: '\u0325', // U+0325
    tipa: wrap('textsubring'),
    name: 'voiceless',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('voiced'),
    ipa: '\u032c', // U+032C
    tipa: wrap('textsubwedge'),
    name: 'voiced',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    // Spacing modifiers follow their base in TIPA too.
    id: symbolId('aspirated'),
    ipa: 'ʰ', // U+02B0
    tipa: command('\\super{h}'),
    name: 'aspirated',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('more-rounded'),
    ipa: '\u0339', // U+0339
    tipa: wrap('textsubrhalfring'),
    name: 'more rounded',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('less-rounded'),
    ipa: '\u031c', // U+031C
    tipa: wrap('textsublhalfring'),
    name: 'less rounded',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('advanced'),
    ipa: '\u031f', // U+031F
    tipa: wrap('textsubplus'),
    name: 'advanced',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('retracted'),
    ipa: '\u0320', // U+0320
    tipa: wrap('textsubbar'),
    name: 'retracted',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    // TIPA has no long name for the diaeresis; \"{e} is the accent macro.
    id: symbolId('centralised'),
    ipa: '\u0308', // U+0308
    tipa: wrap('"'),
    name: 'centralised',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('mid-centralised'),
    ipa: '\u033d', // U+033D
    tipa: wrap('textovercross'),
    name: 'mid-centralised',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('syllabic'),
    ipa: '\u0329', // U+0329
    tipa: wrap('textsyllabic'),
    name: 'syllabic',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('non-syllabic'),
    ipa: '\u032f', // U+032F
    tipa: wrap('textsubarch'),
    name: 'non-syllabic',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('rhoticity'),
    ipa: '˞', // U+02DE
    tipa: macro('textrhoticity'),
    name: 'rhoticity',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('breathy-voiced'),
    ipa: '\u0324', // U+0324
    tipa: wrap('textsubumlaut'),
    name: 'breathy voiced',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('creaky-voiced'),
    ipa: '\u0330', // U+0330
    tipa: wrap('textsubtilde'),
    name: 'creaky voiced',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('linguolabial'),
    ipa: '\u033c', // U+033C
    tipa: wrap('textseagull'),
    name: 'linguolabial',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('labialised'),
    ipa: 'ʷ', // U+02B7
    tipa: command('\\super{w}'),
    name: 'labialised',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('palatalised'),
    ipa: 'ʲ', // U+02B2
    tipa: command('\\super{j}'),
    name: 'palatalised',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('velarised'),
    ipa: 'ˠ', // U+02E0
    tipa: command('\\super{\\textgamma}'),
    name: 'velarised',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('pharyngealised'),
    ipa: 'ˤ', // U+02E4
    tipa: command('\\super{\\textrevglotstop}'),
    name: 'pharyngealised',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('velarised-or-pharyngealised'),
    ipa: '\u0334', // U+0334
    tipa: wrap('textsuperimposetilde'),
    name: 'velarised or pharyngealised',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('raised'),
    ipa: '\u031d', // U+031D
    tipa: wrap('textraising'),
    name: 'raised',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('lowered'),
    ipa: '\u031e', // U+031E
    tipa: wrap('textlowering'),
    name: 'lowered',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('advanced-tongue-root'),
    ipa: '\u0318', // U+0318
    tipa: wrap('textadvancing'),
    name: 'advanced tongue root',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('retracted-tongue-root'),
    ipa: '\u0319', // U+0319
    tipa: wrap('textretracting'),
    name: 'retracted tongue root',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('dental'),
    ipa: '\u032a', // U+032A
    tipa: wrap('textsubbridge'),
    name: 'dental',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('apical'),
    ipa: '\u033a', // U+033A
    tipa: wrap('textinvsubbridge'),
    name: 'apical',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('laminal'),
    ipa: '\u033b', // U+033B
    tipa: wrap('textsubsquare'),
    name: 'laminal',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    // TIPA has no long name for the tilde accent: \~{e}.
    id: symbolId('nasalised'),
    ipa: '\u0303', // U+0303
    tipa: wrap('~'),
    name: 'nasalised',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('nasal-release'),
    ipa: 'ⁿ', // U+207F
    tipa: command('\\super{n}'),
    name: 'nasal release',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    id: symbolId('lateral-release'),
    ipa: 'ˡ', // U+02E1
    tipa: command('\\super{l}'),
    name: 'lateral release',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    // TIPA sets the corner beside its base, so it follows rather than wraps.
    id: symbolId('no-audible-release'),
    ipa: '\u031a', // U+031A
    tipa: macro('textcorner'),
    name: 'no audible release',
    inventories: ['extended'],
    category: 'diacritic',
  },
  {
    // TIPA's apostrophe is the ejective mark; `''` only kerns, it doesn't merge (ADR-0012).
    id: symbolId('ejective'),
    ipa: 'ʼ', // U+02BC
    tipa: lit("'"),
    name: 'ejective',
    inventories: ['extended'],
    category: 'diacritic',
  },
] as const satisfies readonly DiacriticSymbol[];
