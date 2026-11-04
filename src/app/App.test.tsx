import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import { Providers } from './providers';

const renderApp = () =>
  render(
    <Providers>
      <App />
    </Providers>,
  );

describe('<App>', () => {
  it('lays out the top bar, the word card and the palette (SPEC §6)', () => {
    renderApp();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'ipa-helper' })).toBeVisible();
    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByRole('region', { name: 'Word' }));
    expect(main).toContainElement(screen.getByRole('region', { name: 'Symbols' }));
  });

  it('FR-10: clicking palette keys appends symbols to the word', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /^θ\s?,/ }));
    await user.click(screen.getByRole('button', { name: /^ɪ\s?,/ }));
    expect(screen.getByRole('textbox', { name: 'Word' })).toHaveTextContent('/θɪ/');
  });
});
