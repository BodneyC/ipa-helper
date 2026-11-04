import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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

  it('FR-5: can collapse, with the heading as a disclosure button', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <Card title="Vowels" headingLevel={3} collapse={{ collapsed: false, onToggle }}>
        <p>body</p>
      </Card>,
    );
    const toggle = screen.getByRole('button', { name: 'Vowels' });
    expect(screen.getByRole('heading', { level: 3, name: 'Vowels' })).toContainElement(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('body')).toBeVisible();
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(
      <Card title="Vowels" headingLevel={3} collapse={{ collapsed: true, onToggle }}>
        <p>body</p>
      </Card>,
    );
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('body')).not.toBeVisible();
    const body = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(body).toContainElement(screen.getByText('body'));
    expect(screen.getByRole('region', { name: 'Vowels' })).toBeInTheDocument();
  });
});
