import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './Card';

describe('<Card>', () => {
  it('is a section named by its heading', () => {
    render(
      <Card title="Vowels" headingLevel={3} accent="vowel">
        <p>body</p>
      </Card>,
    );
    const region = screen.getByRole('region', { name: 'Vowels' });
    expect(region).toHaveAttribute('data-accent', 'vowel');
    expect(screen.getByRole('heading', { level: 3, name: 'Vowels' })).toBeVisible();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('can hide its heading visually but keep it for screen readers', () => {
    render(
      <Card title="Word" headingLevel={2} hideTitle className="extra">
        <p>body</p>
      </Card>,
    );
    const heading = screen.getByRole('heading', { level: 2, name: 'Word' });
    expect(heading).toHaveClass('visuallyHidden');
    expect(screen.getByRole('region', { name: 'Word' })).toHaveClass('extra');
  });

  it('shows actions next to the heading', () => {
    render(
      <Card title="Diphthongs" headingLevel={3} actions={<button type="button">Collapse</button>}>
        <p>body</p>
      </Card>,
    );
    expect(screen.getByRole('button', { name: 'Collapse' })).toBeVisible();
  });
});
