import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { headerLabel } from './groups';
import { Palette } from './Palette';
import { symbolsIn } from '../../../domain/inventory';
import type { Category, PhoneSymbol } from '../../../domain/inventory/types';

const renderPalette = (rDisplay: 'narrow' | 'broad' = 'narrow', query = '') => {
  const onActivate = vi.fn<(s: PhoneSymbol) => void>();
  const onToggleGroup = vi.fn<(g: Category) => void>();
  const view = render(
    <Palette
      inventory="rp"
      rDisplay={rDisplay}
      query={query}
      collapsedGroups={[]}
      onToggleGroup={onToggleGroup}
      onActivate={onActivate}
    />,
  );
  return { onActivate, onToggleGroup, view };
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
    const keys = screen.getAllByRole('button').filter((b) => !b.hasAttribute('aria-expanded'));
    expect(keys).toHaveLength(symbolsIn('rp').length);
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

  it('FR-4: shows only matching symbols, hides empty groups and says how many match', () => {
    renderPalette('narrow', ' fric ');
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Consonants']);
    expect(screen.getByRole('button', { name: /^ʃ\s?,/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^p\s?,/ })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('10 symbols match “fric”.');
  });

  it('FR-4: says so when nothing matches, and when one symbol does', () => {
    const { unmount } = render(
      <Palette
        inventory="rp"
        rDisplay="narrow"
        query="zzz"
        collapsedGroups={[]}
        onToggleGroup={vi.fn()}
        onActivate={vi.fn()}
      />,
    );
    expect(screen.queryAllByRole('heading', { level: 3 })).toEqual([]);
    expect(screen.getByRole('status')).toHaveTextContent('No symbols match “zzz”.');
    unmount();
    renderPalette('narrow', '2');
    expect(screen.getByRole('status')).toHaveTextContent('1 symbol matches “2”.');
  });

  it('keeps the status region quiet without a filter', () => {
    renderPalette();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('FR-5: collapses groups, and shows every match while filtering', async () => {
    const user = userEvent.setup();
    const { onToggleGroup, view } = renderPalette();
    await user.click(screen.getByRole('button', { name: 'Vowels' }));
    expect(onToggleGroup).toHaveBeenCalledWith('vowel');

    const props = {
      inventory: 'rp',
      rDisplay: 'narrow',
      onToggleGroup,
      onActivate: vi.fn(),
    } as const;
    view.rerender(<Palette {...props} query="" collapsedGroups={['vowel']} />);
    expect(screen.getByRole('button', { name: 'Vowels' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('button', { name: /^ə\s?,/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ʃ\s?,/ })).toBeVisible();

    view.rerender(<Palette {...props} query="about" collapsedGroups={['vowel']} />);
    expect(screen.queryByRole('button', { name: 'Vowels' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ə\s?,/ })).toBeVisible();
  });

  it('turns feature names into header labels', () => {
    expect(headerLabel('lateral-approximant')).toBe('Lateral approximant');
    expect(headerLabel('front')).toBe('Front');
  });
});
