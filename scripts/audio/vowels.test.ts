import { describe, expect, it } from 'vitest';

import { vowelPage } from './vowel-page';
import { parseVowelPicks, VARIANTS, vowelCandidates, vowelSymbols } from './vowels';

describe('vowel clip candidates', () => {
  it('offers every RP vowel and diphthong, and nothing else', () => {
    const ids = vowelSymbols().map((s) => s.id);
    expect(ids).toContain('ash');
    expect(ids).toContain('cure');
    expect(ids).not.toContain('p');
    expect(ids).toHaveLength(24);
  });

  it('fills the vowel into every variant, with unique keys', () => {
    const ash = vowelCandidates().filter((c) => c.id === 'ash');
    expect(ash).toHaveLength(VARIANTS.length);
    expect(new Set(ash.map((c) => c.key)).size).toBe(ash.length);
    expect(ash.find((c) => c.key === 'bang-1')?.text).toBe('ˈæ!');
    expect(ash.find((c) => c.key === 'hvd')?.text).toBe('hˈæd!');
    expect(ash.every((c) => !c.text.includes('V'))).toBe(true);
  });

  it('offers various endings, onsets and speeds', () => {
    const ends = new Set(VARIANTS.map((v) => v.text.replace(/^.*V/u, '').slice(-1)));
    for (const mark of ['!', '.', '?', ',', ';', ':']) expect(ends).toContain(mark);
    expect(VARIANTS.some((v) => v.lengthScale > 1)).toBe(true);
    expect(VARIANTS.some((v) => v.withConsonants === true)).toBe(true);
  });
});

describe('vowel picks', () => {
  it('reads picks and comments, and a vowel with only a comment', () => {
    const read = parseVowelPicks({
      ash: { pick: 'hvd', comment: 'cut the vowel out' },
      schwa: { pick: 'current', comment: '' },
      cure: { comment: 'none of these sound right' },
    });
    expect(read).toEqual({
      ok: true,
      picks: new Map([
        ['ash', { pick: 'hvd', comment: 'cut the vowel out' }],
        ['schwa', { pick: 'current', comment: '' }],
        ['cure', { pick: undefined, comment: 'none of these sound right' }],
      ]),
    });
  });

  it('reports unknown vowels, renderings and malformed files', () => {
    expect(parseVowelPicks([])).toMatchObject({ ok: false });
    expect(parseVowelPicks({ p: { pick: 'bang-1' } })).toEqual({
      ok: false,
      problems: ['p: not an RP vowel'],
    });
    expect(parseVowelPicks({ ash: { pick: 'nope' }, schwa: { comment: 3 } })).toEqual({
      ok: false,
      problems: ['ash: "nope" is not one of its renderings', 'schwa: comment must be text'],
    });
  });
});

describe('vowel listening page', () => {
  it('marks the current clip, tags renders with consonants, and has a comment box per vowel', () => {
    const [ash] = vowelSymbols().filter((s) => s.id === 'ash');
    if (ash === undefined) throw new Error('no ash');
    const rendered = vowelCandidates([ash]).map((c) => ({
      ...c,
      file: `ash/${c.key}.opus`,
      seconds: 0.5,
    }));
    const html = vowelPage([ash], rendered, [
      { id: 'ash', file: 'current/ash.opus', text: 'ˈæ!', seconds: 0.4 },
    ]);
    expect(html).toContain('<strong>CURRENT</strong>');
    expect(html).toContain('src="current/ash.opus"');
    expect(html).toContain('has consonants');
    expect(html).toContain('name="comment-ash"');
    expect(html.match(/type="radio"/g)).toHaveLength(VARIANTS.length + 1);
    expect(vowelPage([ash], [], [])).toContain('No clip in the app yet.');
  });
});
