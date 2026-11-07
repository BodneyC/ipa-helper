import { SYMBOLS } from '../inventory';
import { createResolver } from './serialiser';
import { needsSeparator } from './tipa';
import type { SymbolId } from '../inventory/symbol-id';
import type { PhoneSymbol } from '../inventory/types';
import type { Word } from '../word/word';

/** A word in another notation (FR-25), and the symbols it has no code for. */
export interface Transcription {
  readonly text: string;
  /**
   * Symbols the notation can't write, each once, in order. They are left out of
   * `text`, never guessed at.
   */
  readonly unsupported: readonly SymbolId[];
}

/** Writes a word in one notation (FR-25 – FR-29). */
export interface FormatSerialiser {
  serialise(word: Word): Transcription;
}

/** How an ASCII notation spells symbols (X-SAMPA, Kirshenbaum, eSpeak). */
export interface Notation {
  /** The code for one symbol, or `undefined` when the notation has none. */
  readonly codeOf: (symbol: PhoneSymbol) => string | undefined;
  /**
   * Goes between two sounds whose codes would otherwise read as one
   * (X-SAMPA `t-S`, eSpeak `a|I`). Without one, such a sound is unsupported.
   */
  readonly separator?: string;
  /** Moves each stress mark to just before the next vowel, as eSpeak reads it. */
  readonly stressBeforeVowel?: boolean;
  /**
   * Codes the notation reads that the app never writes, with what they mean,
   * so that two codes can't merge into one of them unseen (eSpeak `''`).
   */
  readonly extraCodes?: ReadonlyMap<string, string>;
  /** Wraps the whole text, e.g. eSpeak's `[[…]]`. */
  readonly wrap?: (text: string) => string;
}

const isNucleus = (s: PhoneSymbol) => s.category === 'vowel' || s.category === 'diphthong';
const isStress = (s: PhoneSymbol) =>
  s.category === 'suprasegmental' && (s.role === 'primary-stress' || s.role === 'secondary-stress');

/** Each stress mark moved rightwards past consonants to just before the next vowel, if any. */
const stressOnVowels = (symbols: readonly PhoneSymbol[]): readonly PhoneSymbol[] => {
  const out: PhoneSymbol[] = [];
  let pending: PhoneSymbol[] = [];
  for (const symbol of symbols) {
    if (isStress(symbol)) pending.push(symbol);
    else {
      if (isNucleus(symbol)) {
        out.push(...pending);
        pending = [];
      }
      out.push(symbol);
    }
  }
  // A stress with no vowel after it stays where the user put it.
  return [...out, ...pending];
};

/**
 * A serialiser for an ASCII notation. Codes are joined as they are, except
 * where two codes would read as a different sound (see {@link needsSeparator}):
 * - a diacritic that would merge with the code before it (X-SAMPA `r\` + `` ` ``
 *   reads as `r\``, ɻ, not ɹ˞) is unsupported;
 * - two sounds that would merge get the separator between them (eSpeak `a|I`,
 *   not `aI`), or, in a notation without one, the second is unsupported.
 *
 * A merge that reads as the same sound is fine: `i` + `:` as `i:` is still iː,
 * and `t` + `S` as `tS` is still tʃ, just as the IPA can't tell them apart.
 *
 * `symbols` defaults to the whole registry; tests pass their own.
 */
export const createNotationSerialiser = (
  notation: Notation,
  symbols: readonly PhoneSymbol[] = SYMBOLS,
): FormatSerialiser => {
  const resolve = createResolver(symbols);
  const ipaByCode = new Map<string, string>();
  for (const s of symbols) {
    const code = notation.codeOf(s);
    if (code !== undefined && !ipaByCode.has(code)) ipaByCode.set(code, s.ipa);
  }
  // By definition the app never writes these, so they never clash with the above.
  for (const [code, ipa] of notation.extraCodes ?? []) ipaByCode.set(code, ipa);
  const codes = [...ipaByCode.keys()];
  const { separator, wrap = (text: string) => text } = notation;
  return {
    serialise: (word) => {
      const resolved = resolve(word);
      const ordered = notation.stressBeforeVowel === true ? stressOnVowels(resolved) : resolved;
      const unsupported = new Set<SymbolId>();
      let text = '';
      let last: { readonly code: string; readonly ipa: string } | undefined;
      for (const symbol of ordered) {
        const code = notation.codeOf(symbol);
        const merges =
          last !== undefined &&
          code !== undefined &&
          needsSeparator(last.code, code, codes) &&
          ipaByCode.get(last.code + code) !== last.ipa + symbol.ipa;
        if (
          code === undefined ||
          (merges && (symbol.category === 'diacritic' || separator === undefined))
        ) {
          unsupported.add(symbol.id);
          continue;
        }
        text += (merges && separator !== undefined ? separator : '') + code;
        last = { code, ipa: symbol.ipa };
      }
      return { text: wrap(text), unsupported: [...unsupported] };
    },
  };
};

/**
 * A notation's code for a symbol, spelt codepoint by codepoint from its IPA, or
 * `undefined` when any codepoint has no code.
 */
export const spellFrom =
  (table: ReadonlyMap<string, string>) =>
  (ipa: string): string | undefined => {
    let code = '';
    for (const c of ipa) {
      const part = table.get(c);
      if (part === undefined) return undefined;
      code += part;
    }
    return code;
  };
