import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { SYMBOLS } from '../inventory';
import { symbolId } from '../inventory/symbol-id';
import { err, mapResult, ok } from '../result';
import { decodeWord, encodeWord } from './url';
import { EMPTY_WORD, idsOf, wordFromIds } from '../word/word';

const ids = (...raw: string[]) => wordFromIds(raw.map(symbolId));
const thornic = ids('primary-stress', 'theta', 'open-o-long', 'n', 'small-cap-i', 'k');
const thornicFragment = 'w=1:primary-stress.theta.open-o-long.n.small-cap-i.k';

const anyWord = fc.array(fc.constantFrom(...SYMBOLS.map((s) => s.id))).map(wordFromIds);

describe('URL fragment codec', () => {
  it('FR-15: encodes a word as versioned symbol IDs', () => {
    expect(encodeWord(thornic)).toBe(thornicFragment);
    expect(encodeWord(EMPTY_WORD)).toBe('');
  });

  it('FR-15: decodes a shared fragment, with or without #', () => {
    expect(decodeWord(thornicFragment)).toEqual(ok(thornic));
    expect(decodeWord(`#${thornicFragment}`)).toEqual(ok(thornic));
  });

  it('decodes a fragment with no word, or an empty one, to the empty word', () => {
    for (const fragment of ['', '#', '#other=1', 'w=1:']) {
      expect(decodeWord(fragment)).toEqual(ok(EMPTY_WORD));
    }
  });

  it('ignores other parameters', () => {
    expect(decodeWord(`#x=y&${thornicFragment}&z`)).toEqual(ok(thornic));
  });

  it('accepts a percent-encoded fragment', () => {
    expect(decodeWord('w=1%3Atheta.n')).toEqual(ok(ids('theta', 'n')));
  });

  it('FR-15: rejects malformed fragments', () => {
    for (const fragment of ['w=', 'w=theta', 'w=v1:theta', 'w=%E0%A4%A']) {
      expect(decodeWord(fragment)).toEqual(err({ kind: 'malformed', fragment }));
    }
  });

  it('FR-15: rejects other format versions', () => {
    expect(decodeWord('w=2:theta')).toEqual(err({ kind: 'unsupported-version', version: '2' }));
  });

  it('FR-15: rejects unknown or invalid symbol IDs', () => {
    expect(decodeWord('w=1:theta.no-such-symbol')).toEqual(
      err({ kind: 'unknown-symbol', id: 'no-such-symbol' }),
    );
    expect(decodeWord('w=1:theta..n')).toEqual(err({ kind: 'unknown-symbol', id: '' }));
    expect(decodeWord('w=1:ʃ')).toEqual(err({ kind: 'unknown-symbol', id: 'ʃ' }));
  });

  it('checks IDs against the symbol set it is given', () => {
    const onlyTheta = SYMBOLS.filter((s) => s.id === symbolId('theta'));
    expect(decodeWord('w=1:theta', onlyTheta)).toEqual(ok(ids('theta')));
    expect(decodeWord('w=1:n', onlyTheta)).toEqual(err({ kind: 'unknown-symbol', id: 'n' }));
  });

  it('round-trips every word to the same symbols', () => {
    fc.assert(
      fc.property(anyWord, (word) => {
        expect(mapResult(decodeWord(encodeWord(word)), idsOf)).toEqual(ok(idsOf(word)));
      }),
    );
  });

  it('writes fragments that need no escaping', () => {
    fc.assert(
      fc.property(anyWord, (word) => {
        const fragment = encodeWord(word);
        expect(encodeURI(`#${fragment}`)).toBe(`#${fragment}`);
      }),
    );
  });

  it('never throws on arbitrary input', () => {
    fc.assert(
      fc.property(fc.string(), (fragment) => {
        expect(() => decodeWord(fragment)).not.toThrow();
        expect(() => decodeWord(`w=1:${fragment}`)).not.toThrow();
      }),
    );
  });
});
