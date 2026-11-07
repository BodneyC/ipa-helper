import { createNotationSerialiser, spellFrom } from './notation';
import type { FormatSerialiser } from './notation';
import { tieBarred } from './serialiser';
import type { PhoneSymbol } from '../inventory/types';

/**
 * X-SAMPA for each IPA codepoint the inventory uses (FR-26), as Wells's
 * X-SAMPA table writes it. A symbol is spelt codepoint by codepoint, so `tʃ`
 * is `tS` and `iː` is `i:`. Where X-SAMPA gives two spellings, this uses the
 * one that can't be misread: `v\` for ʋ (not `P`), `_j` for ʲ (not `'`).
 * The labiodental flap ⱱ has no X-SAMPA, and isn't in the inventory (#38).
 */
// prettier-ignore
export const XSAMPA: ReadonlyMap<string, string> = new Map([
  // Letters X-SAMPA writes as themselves.
  ...Array.from('abcdefhijklmnopqrstuvwxyz').map((c) => [c, c] as const),
  ['ɡ', 'g'],
  // Pulmonic consonants.
  ['ʔ', '?'], ['ŋ', 'N'], ['θ', 'T'], ['ð', 'D'], ['ʃ', 'S'], ['ʒ', 'Z'], ['ɫ', '5'],
  ['ɹ', 'r\\'], ['ʈ', 't`'], ['ɖ', 'd`'], ['ɟ', 'J\\'], ['ɢ', 'G\\'], ['ɱ', 'F'],
  ['ɳ', 'n`'], ['ɲ', 'J'], ['ɴ', 'N\\'], ['ʙ', 'B\\'], ['ʀ', 'R\\'], ['ɾ', '4'],
  ['ɽ', 'r`'], ['ɸ', 'p\\'], ['β', 'B'], ['ʂ', 's`'], ['ʐ', 'z`'], ['ç', 'C'],
  ['ʝ', 'j\\'], ['ʍ', 'W'], ['ɣ', 'G'], ['χ', 'X'], ['ʁ', 'R'], ['ħ', 'X\\'],
  ['ʕ', '?\\'], ['ɦ', 'h\\'], ['ɬ', 'K'], ['ɮ', 'K\\'], ['ʋ', 'v\\'], ['ɻ', 'r\\`'],
  ['ɰ', 'M\\'], ['ɭ', 'l`'], ['ʎ', 'L'], ['ʟ', 'L\\'],
  // Clicks and implosives.
  ['ʘ', 'O\\'], ['ǀ', '|\\'], ['ǃ', '!\\'], ['ǂ', '=\\'], ['ǁ', '|\\|\\'],
  ['ɓ', 'b_<'], ['ɗ', 'd_<'], ['ʄ', 'J\\_<'], ['ɠ', 'g_<'], ['ʛ', 'G\\_<'],
  // Other symbols.
  ['ɥ', 'H'], ['ʜ', 'H\\'], ['ʢ', '<\\'], ['ʡ', '>\\'], ['ɕ', 's\\'], ['ʑ', 'z\\'],
  ['ɺ', 'l\\'], ['ɧ', 'x\\'],
  // Vowels.
  ['ɪ', 'I'], ['æ', '{'], ['ʌ', 'V'], ['ɑ', 'A'], ['ɒ', 'Q'], ['ɔ', 'O'], ['ʊ', 'U'],
  ['ə', '@'], ['ɜ', '3'], ['ɛ', 'E'], ['ɐ', '6'], ['ɨ', '1'], ['ʉ', '}'], ['ɯ', 'M'],
  ['ʏ', 'Y'], ['ø', '2'], ['ɘ', '@\\'], ['ɵ', '8'], ['ɤ', '7'], ['œ', '9'], ['ɞ', '3\\'],
  ['ɶ', '&'],
  // Suprasegmentals.
  ['ˈ', '"'], ['ˌ', '%'], ['ː', ':'], ['ˑ', ':\\'], ['.', '.'],
  // Diacritics.
  ['\u0325', '_0'], ['\u032c', '_v'], ['ʰ', '_h'], ['\u0339', '_O'], ['\u031c', '_c'],
  ['\u031f', '_+'], ['\u0320', '_-'], ['\u0308', '_"'], ['\u033d', '_x'], ['\u0329', '='],
  ['\u032f', '_^'], ['˞', '`'], ['\u0324', '_t'], ['\u0330', '_k'], ['\u033c', '_N'],
  ['ʷ', '_w'], ['ʲ', '_j'], ['ˠ', '_G'], ['ˤ', '_?\\'], ['\u0334', '_e'], ['\u031d', '_r'],
  ['\u031e', '_o'], ['\u0318', '_A'], ['\u0319', '_q'], ['\u032a', '_d'], ['\u033a', '_a'],
  ['\u033b', '_m'], ['\u0303', '~'], ['ⁿ', '_n'], ['ˡ', '_l'], ['\u031a', '_}'],
  ['ʼ', '_>'],
  // The tie bar: `t_S` for a tied tʃ.
  ['\u0361', '_'],
]);

const spell = spellFrom(XSAMPA);

/**
 * FR-26: X-SAMPA. Symbols are written from their stored IPA, so the British r
 * is `r\` even when it is shown broad (Q-3): X-SAMPA's `r` is the trill. With
 * tie bars on (SPEC §7.2), affricates are tied: `t_S`. `-` separates two
 * sounds that would otherwise read as one.
 */
export const createXsampaSerialiser = (
  { tieBars }: { readonly tieBars: boolean },
  symbols?: readonly PhoneSymbol[],
): FormatSerialiser =>
  createNotationSerialiser(
    {
      codeOf: (s) => spell(tieBars && s.category === 'affricate' ? tieBarred(s.ipa) : s.ipa),
      separator: '-',
    },
    symbols,
  );
