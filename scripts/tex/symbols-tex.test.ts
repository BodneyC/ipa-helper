import { describe, expect, it } from 'vitest';

import { symbolsTex } from './symbols-tex';
import { SYMBOLS } from '../../src/domain/inventory/index';
import { createTipaSerialiser } from '../../src/domain/serialise/tipa';
import { wordFromIds } from '../../src/domain/word/word';

const tex = symbolsTex();
const tipa = createTipaSerialiser({ slashes: false, rDisplay: 'narrow', tieBars: false });

const balanced = (text: string): boolean => {
  let depth = 0;
  for (const c of text) {
    depth += c === '{' ? 1 : c === '}' ? -1 : 0;
    if (depth < 0) return false;
  }
  return depth === 0;
};

describe('TeX compile fixture (M6.4, FR-22)', () => {
  it('loads tipa and defines the macro the settings dialog suggests', () => {
    expect(tex).toContain('\\usepackage{tipa}');
    expect(tex).toContain('\\newcommand{\\ipa}[1]{\\textipa{/#1/}}');
    expect(tex).toContain('\\tracinglostchars=3');
  });

  it('FR-22: has a row for every symbol, written as the app writes it', () => {
    const missing = SYMBOLS.filter(
      (s) => !tex.includes(`\\texttt{${s.id}} & \\ipa{${tipa.serialise(wordFromIds([s.id]))}}`),
    );
    expect(missing.map((s) => s.id)).toEqual([]);
    expect(tex).toContain('\\texttt{turned-r (broad)} & \\ipa{r}');
    expect(tex).toContain('\\texttt{tesh (tie bar)} & \\ipa{\\t{tS}}');
    expect(tex).toContain('\\ipa{\\t{dZ}\\ae{}}');
  });

  it('covers every diacritic on a base, and every ordered pair of symbols', () => {
    expect(tex).toContain('\\texttt{n+voiceless} & \\ipa{\\textsubring{n}}');
    expect(tex).toContain('\\ipa{\\textsubring{\\textsyllabic{n}}}');
    const pairs = tex.slice(tex.indexOf('Every ordered pair'));
    expect(pairs.match(/\\ipa\{/g)).toHaveLength(SYMBOLS.length ** 2);
    expect(pairs).toContain('\\ipa{"{}"}');
  });

  it('FR-24: writes every symbol alone and every ordered pair in minimal-braces mode too', () => {
    const minimal = tex.slice(tex.indexOf('Minimal braces'), tex.indexOf('Every ordered pair'));
    expect(minimal.match(/\\ipa\{/g)).toHaveLength(SYMBOLS.length * (SYMBOLS.length + 1));
    expect(minimal).toContain('\\ipa{\\ae p}');
    expect(minimal).toContain('\\ipa{\\ae"}');
  });

  it('is printable ASCII with balanced braces, so only TeX can find fault with it', () => {
    expect(tex).toMatch(/^[\x20-\x7e\n]*$/);
    expect(balanced(tex)).toBe(true);
  });
});
