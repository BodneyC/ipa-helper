import { createResolver } from './serialiser';
import type { Serialiser } from './serialiser';
import { isSounding, SYMBOLS } from '../inventory';
import type { SymbolId } from '../inventory/symbol-id';
import type { PhoneSymbol } from '../inventory/types';
import { err, ok } from '../result';
import type { Result } from '../result';

const isNucleus = (symbol: PhoneSymbol): boolean =>
  symbol.category === 'vowel' || symbol.category === 'diphthong';

const isStress = (symbol: PhoneSymbol): boolean =>
  symbol.category === 'suprasegmental' &&
  (symbol.role === 'primary-stress' || symbol.role === 'secondary-stress');

const isSyllableBreak = (symbol: PhoneSymbol): boolean =>
  symbol.category === 'suprasegmental' && symbol.role === 'syllable-break';

/**
 * The text a word gives the Piper voice (FR-31, ADR-0009), or `''` when the
 * word has nothing to say.
 *
 * - Each stress mark moves rightwards past consonants to just before the next
 *   vowel or diphthong, as espeak-ng (and so the voice's training data) writes
 *   it: `ˈflɒɡ` → `flˈɒɡ`. A stress mark with no vowel after it is dropped.
 * - Syllable breaks are dropped: the voice would read `.` as a full stop.
 * - Length marks stay where they are, so length still changes the sound.
 * - Every word ends in `!`, which stops the voice running on at any length
 *   (#33).
 */
const piperText = (symbols: readonly PhoneSymbol[]): string => {
  let text = '';
  let pendingStress = '';
  let sounding = false;
  for (const symbol of symbols) {
    if (isStress(symbol)) {
      pendingStress += symbol.ipa;
      continue;
    }
    if (isSyllableBreak(symbol)) continue;
    if (isNucleus(symbol)) {
      text += pendingStress;
      pendingStress = '';
    }
    text += symbol.ipa;
    if (isSounding(symbol)) sounding = true;
  }
  return sounding ? `${text}!` : '';
};

/**
 * Creates the Piper serialiser. `symbols` defaults to the whole registry;
 * tests pass their own fixtures.
 */
export const createPiperSerialiser = (symbols?: readonly PhoneSymbol[]): Serialiser => {
  const resolve = createResolver(symbols);
  return { id: 'piper', serialise: (word) => piperText(resolve(word)) };
};

/** Word → the voice's input text (M5.1). Map it to IDs with {@link piperPhonemeIds}. */
export const piperPhonemeSerialiser: Serialiser = createPiperSerialiser();

/** A Piper voice's `phoneme_id_map`: one codepoint → its IDs. */
export type PhonemeIdMap = Readonly<Record<string, readonly number[] | undefined>>;

/** What the voice is given for a word, and the diacritics left out of it (#15). */
export interface PiperInput {
  readonly ids: readonly number[];
  /** Each diacritic the voice has no ID for, once, in the order they first appear. */
  readonly dropped: readonly SymbolId[];
}

/** Diacritics by their (single) codepoint. */
const MARKS: ReadonlyMap<string, SymbolId> = new Map(
  SYMBOLS.filter((s) => s.category === 'diacritic').map((s) => [s.ipa, s.id]),
);

/**
 * Piper's input encoding (ADR-0009): BOS `^` then PAD `_`, then each codepoint
 * followed by PAD, then EOS `$`. A diacritic the voice lacks is left out, so
 * the base sound is still spoken, and reported in `dropped` (#15). Any other
 * codepoint the voice lacks (including a missing control symbol) fails, with
 * every such codepoint, so nothing else is silently skipped.
 */
export const piperPhonemeIds = (
  text: string,
  map: PhonemeIdMap,
): Result<PiperInput, readonly string[]> => {
  const missing: string[] = [];
  const dropped = new Set<SymbolId>();
  const idsOf = (symbol: string): readonly number[] => {
    const ids = map[symbol];
    if (ids === undefined) missing.push(symbol);
    return ids ?? [];
  };
  const [bos, pad, eos] = [idsOf('^'), idsOf('_'), idsOf('$')];
  const ids = [...bos, ...pad];
  for (const symbol of text) {
    const mark = MARKS.get(symbol);
    if (mark !== undefined && map[symbol] === undefined) {
      dropped.add(mark);
      continue;
    }
    ids.push(...idsOf(symbol), ...pad);
  }
  ids.push(...eos);
  return missing.length > 0 ? err(missing) : ok({ ids, dropped: [...dropped] });
};
