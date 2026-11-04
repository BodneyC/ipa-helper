import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('<App>', () => {
  it('lays out the top bar, the word card and the palette (SPEC §6)', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'ipa-helper' })).toBeVisible();
    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByRole('region', { name: 'Word' }));
    expect(main).toContainElement(screen.getByRole('region', { name: 'Symbols' }));
  });
});
