import { describe, expect, it } from 'vitest';

import {
  consonantChart,
  isImpossible,
  TRAPEZOID_OUTLINE,
  trapezoidPoint,
  vowelTrapezoid,
} from './chart';
import type { ChartSlot } from './chart';
import { CONSONANTS } from './consonants';
import { BACKNESSES, HEIGHTS } from './types';
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

describe('vowel trapezoid (FR-1)', () => {
  const clusters = vowelTrapezoid(VOWELS);
  const at = (height: string, backness: string) =>
    clusters
      .find((c) => c.height === height && c.backness === backness)
      ?.symbols.map((v) => v.ipa)
      .join(' ');

  it('puts the corners of the trapezoid where the IPA chart does', () => {
    expect(trapezoidPoint('close', 'front')).toEqual({ x: 0, y: 0 });
    expect(trapezoidPoint('close', 'back')).toEqual({ x: 1, y: 0 });
    expect(trapezoidPoint('open', 'back')).toEqual({ x: 1, y: 1 });
    expect(trapezoidPoint('open', 'front')).toEqual({ x: 0.5, y: 1 });
    expect(TRAPEZOID_OUTLINE).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0.5, y: 1 },
    ]);
  });

  it('keeps every point inside the trapezoid, with the front edge slanting', () => {
    for (const height of HEIGHTS) {
      const front = trapezoidPoint(height, 'front');
      expect(front.x).toBeCloseTo(front.y / 2);
      for (const backness of BACKNESSES) {
        const { x, y } = trapezoidPoint(height, backness);
        expect(x).toBeGreaterThanOrEqual(y / 2);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('pairs short with long, and unrounded with rounded, at each point', () => {
    expect(at('close', 'front')).toBe('i iː');
    expect(at('close', 'back')).toBe('u uː');
    expect(at('near-close', 'near-front')).toBe('ɪ');
    expect(at('open-mid', 'back')).toBe('ʌ ɔː');
    expect(at('open', 'back')).toBe('ɑː ɒ');
    expect(at('mid', 'central')).toBe('ə');
  });

  it('lists clusters close to open, then front to back', () => {
    expect(clusters.map((c) => c.symbols[0]?.ipa).join(' ')).toBe('i u ɪ ʊ e ə ɛ ɜː ʌ æ ɐ ɑː');
  });

  it('places every vowel exactly once', () => {
    expect(clusters.flatMap((c) => c.symbols)).toHaveLength(VOWELS.length);
    expect(vowelTrapezoid([])).toEqual([]);
  });
});
