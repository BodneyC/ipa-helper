import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { headerLabel } from './groups';
import { Palette } from './Palette';
import { symbolsIn } from '../../../domain/inventory';
import type { PhoneSymbol } from '../../../domain/inventory/types';

const renderPalette = (rDisplay: 'narrow' | 'broad' = 'narrow') => {
  const onActivate = vi.fn<(s: PhoneSymbol) => void>();
  render(<Palette inventory="rp" rDisplay={rDisplay} onActivate={onActivate} />);
  return { onActivate };
};

describe('<Palette>', () => {
  it('FR-1: shows the groups in display order, each as a named region', () => {
    renderPalette();
    const palette = screen.getByRole('region', { name: 'Symbols' });
    const headings = within(palette)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      'Consonants',
      'Affricates',
      'Vowels',
      'Diphthongs',
      'Suprasegmentals',
    ]);
  });

  it('FR-1, FR-3: has one key per RP symbol', () => {
    renderPalette();
    expect(screen.getAllByRole('button')).toHaveLength(symbolsIn('rp').length);
  });

  it('FR-1: lays consonants out as a chart with place and manner headers', () => {
    renderPalette();
    const consonants = screen.getByRole('region', { name: 'Consonants' });
    const table = within(consonants).getByRole('table');
    const columns = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(columns).toEqual([
      'Bilabial',
      'Labiodental',
      'Dental',
      'Alveolar',
      'Postalveolar',
      'Palatal',
      'Labial velar',
      'Velar',
      'Glottal',
    ]);
    const rows = within(table)
      .getAllByRole('rowheader')
      .map((h) => h.textContent);
    expect(rows).toEqual(['Plosive', 'Nasal', 'Fricative', 'Approximant', 'Lateral approximant']);
    const plosives = within(table).getAllByRole('row')[1];
    expect(plosives).toBeDefined();
    const keys = within(plosives ?? table)
      .getAllByRole('button')
      .map((b) => b.textContent.charAt(0));
    expect(keys).toEqual(['p', 'b', 't', 'd', 'k', 'ɡ', 'ʔ']);
    expect(within(table).getAllByText(/judged impossible/).length).toBeGreaterThan(0);
  });

  it('FR-1: lays vowels out on the trapezoid, close front at the top left', () => {
    renderPalette();
    const vowels = screen.getByRole('region', { name: 'Vowels' });
    const chart = within(vowels).getByRole('figure', { name: /^Vowel chart/ });
    const clusters = within(chart).getAllByRole('listitem');
    expect(clusters[0]).toHaveStyle({ left: '0%', top: '0%' });
    expect(
      within(clusters[0] ?? chart)
        .getAllByRole('button')
        .map((b) => b.textContent.charAt(0)),
    ).toEqual(['i', 'i']);
    const open = clusters.at(-1) ?? chart;
    expect(open).toHaveStyle({ left: '100%', top: '100%' });
    expect(within(open).getAllByRole('button')).toHaveLength(2);
  });

  it('FR-10: activating a key reports its symbol', async () => {
    const user = userEvent.setup();
    const { onActivate } = renderPalette();
    await user.click(screen.getByRole('button', { name: /^ʃ\s?,/ }));
    await user.click(screen.getByRole('button', { name: /^eɪ\s?,/ }));
    await user.click(screen.getByRole('button', { name: /^ˈ\s?,/ }));
    expect(onActivate.mock.calls.map(([s]) => s.ipa)).toEqual(['ʃ', 'eɪ', 'ˈ']);
  });

  it('Q-3: shows the broad r on the key when asked', () => {
    renderPalette('broad');
    expect(
      screen.getByRole('button', { name: /^r\s?, voiced alveolar approximant/ }),
    ).toBeVisible();
  });

  it('turns feature names into header labels', () => {
    expect(headerLabel('lateral-approximant')).toBe('Lateral approximant');
    expect(headerLabel('front')).toBe('Front');
  });
});
