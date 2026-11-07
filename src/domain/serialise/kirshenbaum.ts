import { createNotationSerialiser, spellFrom } from './notation';
import type { FormatSerialiser } from './notation';
import type { PhoneSymbol } from '../inventory/types';

/**
 * Kirshenbaum (Usenet ASCII-IPA) for each IPA codepoint it has a code for
 * (FR-27), from the consonant, vowel and modifier charts of its description.
 * Codepoints it has no code for are left out of the table on purpose, so the
 * symbols that use them are reported, not guessed: ɫ, the palatal click ǂ
 * (ASCII-IPA's `c!` covers ǃ), ɥ ʜ ʢ ʡ ɕ ʑ ɧ, half-length, the syllable break,
 * and every diacritic except nasalised `~`, centralised `"`, breathy `<?>`
 * and rhoticity `<r>`.
 */
// prettier-ignore
export const KIRSHENBAUM: ReadonlyMap<string, string> = new Map([
  // Letters Kirshenbaum writes as themselves.
  ...Array.from('bcdfhjklmnpqstvwxyzaeiou').map((c) => [c, c] as const),
  ['ɡ', 'g'],
  // Pulmonic consonants.
  ['ʔ', '?'], ['ŋ', 'N'], ['θ', 'T'], ['ð', 'D'], ['ʃ', 'S'], ['ʒ', 'Z'], ['ɹ', 'r'],
  ['ʈ', 't.'], ['ɖ', 'd.'], ['ɟ', 'J'], ['ɢ', 'G'], ['ɱ', 'M'], ['ɳ', 'n.'], ['ɲ', 'n^'],
  ['ɴ', 'n"'], ['ʙ', 'b<trl>'], ['r', 'r<trl>'], ['ʀ', 'r"'], ['ɾ', '*'], ['ɽ', '*.'],
  ['ɸ', 'P'], ['β', 'B'], ['ʂ', 's.'], ['ʐ', 'z.'], ['ç', 'C'], ['ʝ', 'C<vcd>'],
  ['ʍ', 'w<vls>'], ['ɣ', 'Q'], ['χ', 'X'], ['ʁ', 'g"'], ['ħ', 'H'], ['ʕ', 'H<vcd>'],
  ['ɦ', 'h<?>'], ['ɬ', 's<lat>'], ['ɮ', 'z<lat>'], ['ʋ', 'r<lbd>'], ['ɻ', 'r.'],
  ['ɰ', 'j<vel>'], ['ɭ', 'l.'], ['ʎ', 'l^'], ['ʟ', 'L'], ['ɺ', '*<lat>'],
  // Clicks, implosives and the ejective mark.
  ['ʘ', 'p!'], ['ǀ', 't!'], ['ǃ', 'c!'], ['ǁ', 'l!'],
  ['ɓ', 'b`'], ['ɗ', 'd`'], ['ʄ', 'J`'], ['ɠ', 'g`'], ['ʛ', 'G`'], ['ʼ', '`'],
  // Vowels.
  ['ɪ', 'I'], ['ʏ', 'I.'], ['ʊ', 'U'], ['ɨ', 'i"'], ['ʉ', 'u"'], ['ɯ', 'u-'],
  ['ø', 'Y'], ['ɘ', '@<umd>'], ['ɵ', '@.'], ['ɤ', 'o-'], ['ə', '@'], ['ɛ', 'E'],
  ['œ', 'W'], ['ɜ', 'V"'], ['ɞ', 'O"'], ['ʌ', 'V'], ['ɔ', 'O'], ['æ', '&'], ['ɐ', '&"'],
  ['ɶ', 'a.'], ['ɑ', 'A'], ['ɒ', 'A.'],
  // Suprasegmentals: stress goes before the stressed syllable, as in IPA.
  ['ˈ', "'"], ['ˌ', ','], ['ː', ':'],
  // Diacritics, which follow the symbol they modify.
  ['\u0303', '~'], ['\u0308', '"'], ['\u0324', '<?>'], ['˞', '<r>'],
]);

const spell = spellFrom(KIRSHENBAUM);

/**
 * FR-27: Kirshenbaum. Symbols are written from their stored IPA, so the British
 * r is `r` (Kirshenbaum's approximant) even when shown broad (Q-3), and the
 * trill is `r<trl>`. Kirshenbaum has no tie bar, so affricates are their two
 * parts (`tS`) whatever the tie-bar setting. Kirshenbaum has no separator, so a sound whose code would
 * merge with the one before into a different sound is unsupported.
 */
export const createKirshenbaumSerialiser = (symbols?: readonly PhoneSymbol[]): FormatSerialiser =>
  createNotationSerialiser({ codeOf: (s) => spell(s.ipa) }, symbols);
