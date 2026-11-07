import { createNotationSerialiser } from './notation';
import type { FormatSerialiser } from './notation';
import type { SymbolId } from '../inventory/symbol-id';
import type { PhoneSymbol } from '../inventory/types';

/**
 * eSpeak NG's phoneme mnemonics for British English (FR-28), as its English
 * dictionary (`dictsource/en_list`) and phoneme tables write them. Only the RP
 * sounds have one; anything else, ˑ and the syllable break included, is
 * reported. eSpeak has one l, which it darkens itself, so ɫ is `l`.
 */
// prettier-ignore
export const ESPEAK: ReadonlyMap<string, string> = new Map<string, string>([
  // Consonants.
  ['p', 'p'], ['b', 'b'], ['t', 't'], ['d', 'd'], ['k', 'k'], ['g', 'g'],
  ['glottal-stop', '?'], ['m', 'm'], ['n', 'n'], ['eng', 'N'], ['f', 'f'], ['v', 'v'],
  ['theta', 'T'], ['eth', 'D'], ['s', 's'], ['z', 'z'], ['esh', 'S'], ['ezh', 'Z'],
  ['x', 'x'], ['h', 'h'], ['l', 'l'], ['dark-l', 'l'], ['turned-r', 'r'], ['j', 'j'],
  ['w', 'w'], ['tesh', 'tS'], ['dezh', 'dZ'],
  // Vowels: KIT, FLEECE, DRESS (e and ɛ), TRAP, STRUT, PALM, LOT, THOUGHT, FOOT,
  // GOOSE, schwa, NURSE, and the final vowel of happy.
  ['small-cap-i', 'I'], ['i-long', 'i:'], ['e', 'E'], ['epsilon', 'E'], ['ash', 'a'],
  ['turned-v', 'V'], ['script-a-long', 'A:'], ['turned-script-a', '0'], ['open-o-long', 'O:'],
  ['upsilon', 'U'], ['u-long', 'u:'], ['schwa', '@'], ['rev-epsilon-long', '3:'], ['i', 'i'],
  // Diphthongs.
  ['face', 'eI'], ['price', 'aI'], ['choice', 'OI'], ['goat', 'oU'], ['mouth', 'aU'],
  ['near', 'i@'], ['square', 'e@'], ['cure', 'U@'],
  // Stress, and length on the vowel before it.
  ['primary-stress', "'"], ['secondary-stress', ','], ['length', ':'],
]);

/**
 * eSpeak mnemonics the app never writes but eSpeak reads, so that two of the
 * app's must not run into one: the priority stresses `''` and `,,`, emphatic
 * `'!`, and the RP vowels `aa` (BATH) and `i@3`. Their meanings only need to differ
 * from what was written, so the stresses read as "stress".
 */
const EXTRA: ReadonlyMap<string, string> = new Map([
  ["''", 'stress'],
  [',,', 'stress'],
  ["'!", 'stress'],
  ['aa', 'ɑː'],
  ['i@3', 'ɪə'],
]);

/**
 * FR-28: eSpeak NG phoneme input, `[[…]]`, which `espeak-ng -v en-gb` speaks
 * as written. Stress marks move to just before the stressed vowel, and `|`
 * separates mnemonics that would otherwise read as one (`a|I` is æ then ɪ).
 */
export const createEspeakSerialiser = (symbols?: readonly PhoneSymbol[]): FormatSerialiser =>
  createNotationSerialiser(
    {
      codeOf: (s) => ESPEAK.get(s.id satisfies SymbolId),
      separator: '|',
      stressBeforeVowel: true,
      extraCodes: EXTRA,
      wrap: (text) => `[[${text}]]`,
    },
    symbols,
  );
