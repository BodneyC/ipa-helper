import { describe, expect, it } from 'vitest';

import { consonantChart, isImpossible, vowelGrid } from './chart';
import type { ChartSlot } from './chart';
import { CONSONANTS } from './consonants';
import { VOWELS } from './vowels';

const ipa = (slot: ChartSlot | undefined): string =>
  slot === undefined
    ? '?'
    : slot.kind === 'symbols'
      ? slot.symbols.map((s) => s.ipa).join('')
      : slot.kind;

describe('consonant chart (FR-1)', () => {
  const chart = consonantChart(CONSONANTS);

  it('shows only the places and manners RP uses, in IPA chart order', () => {
    expect(chart.places).toEqual([
      'bilabial',
      'labiodental',
      'dental',
      'alveolar',
      'postalveolar',
      'palatal',
      'labial-velar',
      'velar',
      'glottal',
    ]);
    expect(chart.manners).toEqual([
      'plosive',
      'nasal',
      'fricative',
      'approximant',
      'lateral-approximant',
    ]);
  });

  it('puts voiceless on the left and voiced on the right of each cell', () => {
    const plosives = chart.rows[0] ?? [];
    expect(plosives.map((c) => `${ipa(c.voiceless)}|${ipa(c.voiced)}`)).toEqual([
      'p|b',
      'empty|empty',
      'empty|empty',
      't|d',
      'empty|empty',
      'empty|empty',
      'empty|empty',
      'k|ɡ',
      'ʔ|impossible',
    ]);
  });

  it('marks impossible cells apart from merely empty ones', () => {
    const nasals = chart.rows[1] ?? [];
    expect(ipa(nasals.at(-1)?.voiceless)).toBe('impossible'); // glottal nasal
    expect(ipa(nasals[0]?.voiceless)).toBe('empty'); // voiceless bilabial nasal
    const laterals = chart.rows[4] ?? [];
    expect(ipa(laterals[0]?.voiced)).toBe('impossible'); // bilabial lateral
  });

  it('keeps dark l with plain l in one slot', () => {
    const laterals = chart.rows[4] ?? [];
    expect(ipa(laterals[3]?.voiced)).toBe('lɫ');
  });

  it('places every consonant exactly once', () => {
    const placed = chart.rows
      .flat()
      .flatMap((c) => [c.voiceless, c.voiced])
      .flatMap((s) => (s.kind === 'symbols' ? s.symbols : []));
    expect(placed.toSorted((a, b) => a.id.localeCompare(b.id))).toEqual(
      CONSONANTS.toSorted((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it('follows the IPA chart’s shading', () => {
    expect(isImpossible('glottal', 'plosive', true)).toBe(true);
    expect(isImpossible('glottal', 'plosive', false)).toBe(false);
    expect(isImpossible('pharyngeal', 'nasal', false)).toBe(true);
    expect(isImpossible('velar', 'trill', true)).toBe(true);
    expect(isImpossible('labiodental', 'lateral-fricative', false)).toBe(true);
    expect(isImpossible('alveolar', 'fricative', true)).toBe(false);
  });

  it('copes with no symbols', () => {
    expect(consonantChart([])).toEqual({ places: [], manners: [], rows: [] });
  });
});

describe('vowel grid (FR-1)', () => {
  const grid = vowelGrid(VOWELS);
  const cell = (row: number, col: number) =>
    (grid.rows[row]?.[col] ?? []).map((v) => v.ipa).join(' ');

  it('has a row per height RP uses, close to open, and front/central/back columns', () => {
    expect(grid.heights).toEqual([
      'close',
      'near-close',
      'close-mid',
      'mid',
      'open-mid',
      'near-open',
      'open',
    ]);
    expect(grid.columns).toEqual(['front', 'central', 'back']);
  });

  it('pairs short with long, and unrounded with rounded, in each cell', () => {
    expect(cell(0, 0)).toBe('i iː');
    expect(cell(0, 2)).toBe('u uː');
    expect(cell(1, 0)).toBe('ɪ');
    expect(cell(1, 2)).toBe('ʊ');
    expect(cell(4, 2)).toBe('ʌ ɔː');
    expect(cell(6, 2)).toBe('ɑː ɒ');
    expect(cell(3, 1)).toBe('ə');
  });

  it('places every vowel exactly once', () => {
    expect(grid.rows.flat(2)).toHaveLength(VOWELS.length);
  });
});
