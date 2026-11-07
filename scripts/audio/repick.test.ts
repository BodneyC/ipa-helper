import { describe, expect, it } from 'vitest';

import {
  candidatesFor,
  chosenRenders,
  CONSONANT_VARIANTS,
  extendedSymbols,
  parsePicks,
  parseRenders,
  symbolsOf,
  unproducible,
  VARIANTS,
  variantsFor,
  vowelSymbols,
} from './repick';
import { repickPage } from './repick-page';

const symbol = (id: string) => {
  const found = [...vowelSymbols(), ...extendedSymbols()].find((s) => s.id === id);
  if (found === undefined) throw new Error(`no ${id}`);
  return found;
};

describe('sets', () => {
  it('vowels: every RP vowel and diphthong, and nothing else', () => {
    const ids = vowelSymbols().map((s) => s.id);
    expect(ids).toContain('ash');
    expect(ids).toContain('cure');
    expect(ids).not.toContain('p');
    expect(ids).toHaveLength(24);
    expect(symbolsOf('vowels')).toEqual(vowelSymbols());
  });

  it('extended (#14): every sound only the full IPA has, and no RP or silent symbol', () => {
    const ids = extendedSymbols().map((s) => s.id);
    expect(ids).toContain('c-cedilla');
    expect(ids).toContain('bilabial-click');
    expect(ids).toContain('curly-tail-c');
    expect(ids).toContain('y');
    expect(ids).not.toContain('esh');
    expect(ids).not.toContain('nasalised');
    expect(ids).toHaveLength(73);
    expect(symbolsOf('extended')).toEqual(extendedSymbols());
  });
});

describe('candidates', () => {
  it('fills the vowel into every vowel variant, with unique keys', () => {
    const ash = candidatesFor([symbol('ash')]);
    expect(ash).toHaveLength(VARIANTS.length);
    expect(new Set(ash.map((c) => c.key)).size).toBe(ash.length);
    expect(ash.find((c) => c.key === 'bang-1')?.text).toBe('ˈæ!');
    expect(ash.find((c) => c.key === 'hvd')?.text).toBe('hˈæd!');
    expect(ash.every((c) => !c.text.includes('V'))).toBe(true);
  });

  it('frames consonants as the RP consonant clips are, and other ways', () => {
    expect(variantsFor(symbol('c-cedilla'))).toBe(CONSONANT_VARIANTS);
    expect(variantsFor(symbol('y'))).toBe(VARIANTS);
    const click = candidatesFor([symbol('bilabial-click')]);
    expect(click).toHaveLength(CONSONANT_VARIANTS.length);
    expect(new Set(click.map((c) => c.key)).size).toBe(click.length);
    expect(click.find((c) => c.key === 'schwa-both-1')?.text).toBe('əʘˈə!');
    expect(click.find((c) => c.key === 'a-both')?.text).toBe('ˈaʘa!');
  });

  it('offers various endings, onsets and speeds', () => {
    const ends = new Set(VARIANTS.map((v) => v.text.replace(/^.*V/u, '').slice(-1)));
    for (const mark of ['!', '.', '?', ',', ';', ':']) expect(ends).toContain(mark);
    expect(VARIANTS.some((v) => v.lengthScale > 1)).toBe(true);
    expect(VARIANTS.some((v) => v.withConsonants === true)).toBe(true);
  });
});

describe('picks', () => {
  it('reads picks, none and comments, and a sound with only a comment', () => {
    const read = parsePicks(
      {
        ash: { pick: 'hvd', comment: 'cut the vowel out' },
        schwa: { pick: 'current', comment: '' },
        cure: { comment: 'none of these sound right' },
      },
      vowelSymbols(),
    );
    expect(read).toEqual({
      ok: true,
      picks: new Map([
        ['ash', { pick: 'hvd', comment: 'cut the vowel out' }],
        ['schwa', { pick: 'current', comment: '' }],
        ['cure', { pick: undefined, comment: 'none of these sound right' }],
      ]),
    });
    expect(
      parsePicks(
        { 'bilabial-click': { pick: 'none' }, 'c-cedilla': { pick: 'schwa-both-2' } },
        extendedSymbols(),
      ),
    ).toMatchObject({ ok: true });
  });

  it("checks each pick against the sound's own variants", () => {
    // A consonant has no vowel variants, and the reverse.
    expect(parsePicks({ 'c-cedilla': { pick: 'bang-1' } }, extendedSymbols())).toEqual({
      ok: false,
      problems: ['c-cedilla: "bang-1" is not one of its renderings'],
    });
    expect(parsePicks({ y: { pick: 'schwa-both-1' } }, extendedSymbols())).toMatchObject({
      ok: false,
    });
  });

  it('reports sounds not in the set, unknown renderings and malformed files', () => {
    expect(parsePicks([], vowelSymbols())).toMatchObject({ ok: false });
    expect(parsePicks({ p: { pick: 'bang-1' } }, vowelSymbols())).toEqual({
      ok: false,
      problems: ['p: not in this set'],
    });
    expect(parsePicks({ ash: { pick: 'nope' }, schwa: { comment: 3 } }, vowelSymbols())).toEqual({
      ok: false,
      problems: ['ash: "nope" is not one of its renderings', 'schwa: comment must be text'],
    });
    expect(parsePicks({ ash: 'x' }, vowelSymbols())).toEqual({
      ok: true,
      picks: new Map([['ash', { pick: undefined, comment: '' }]]),
    });
  });
});

describe('choosing renders', () => {
  const render = (id: string, key: string) => ({
    id,
    key,
    text: 'ˈæ!',
    lengthScale: 1,
    file: `${id}/${key}.opus`,
  });

  it('takes one render per new pick; current, none and unpicked add nothing', () => {
    const picks = new Map([
      ['ash', { pick: 'comma', comment: '' }],
      ['schwa', { pick: 'current', comment: '' }],
      ['cure', { pick: undefined, comment: 'later' }],
      ['near', { pick: 'none', comment: '' }],
    ]);
    expect(chosenRenders(picks, [render('ash', 'bang-1'), render('ash', 'comma')])).toEqual([
      render('ash', 'comma'),
    ]);
    expect(unproducible(picks)).toEqual(['near']);
  });

  it('fails on a pick with no render', () => {
    expect(() => chosenRenders(new Map([['ash', { pick: 'comma', comment: '' }]]), [])).toThrow(
      'ash/comma: no render',
    );
  });

  it('reads renders.json, and rejects a malformed one', () => {
    expect(parseRenders({ rendered: [render('ash', 'comma')], current: [] })).toEqual([
      render('ash', 'comma'),
    ]);
    expect(() => parseRenders({ rendered: [{ id: 'ash' }] })).toThrow('malformed');
    expect(() => parseRenders(null)).toThrow('malformed');
  });
});

describe('listening page', () => {
  it('marks the current clip, tags renders with consonants, and has NONE and a comment box', () => {
    const ash = symbol('ash');
    const rendered = candidatesFor([ash]).map((c) => ({
      ...c,
      file: `ash/${c.key}.opus`,
      seconds: 0.5,
    }));
    const html = repickPage('vowels', [ash], rendered, [
      { id: 'ash', file: 'current/ash.opus', text: 'ˈæ!', seconds: 0.4 },
    ]);
    expect(html).toContain('<strong>CURRENT</strong>');
    expect(html).toContain('src="current/ash.opus"');
    expect(html).toContain('has consonants');
    expect(html).toContain('value="none"');
    expect(html).toContain('name="comment-ash"');
    expect(html).toContain('vowel-picks.json');
    expect(html.match(/type="radio"/g)).toHaveLength(VARIANTS.length + 2);
  });

  it('names the extended set, and says when there is no clip yet', () => {
    const html = repickPage('extended', [symbol('c-cedilla')], [], []);
    expect(html).toContain('No clip in the app yet.');
    expect(html).toContain('extended-picks.json');
    expect(html).toContain('<title>Full-IPA clip picks</title>');
  });
});
