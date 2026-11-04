import { describe, expect, it, vi } from 'vitest';

import { createDocumentTheme } from './document-theme';

/** A `prefers-color-scheme: light` query we control, on a real EventTarget. */
const fakeQuery = (light: boolean) => {
  const target = new EventTarget();
  const query = {
    matches: light,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  };
  const flip = (to: boolean) => {
    query.matches = to;
    target.dispatchEvent(new Event('change'));
  };
  return { query, flip };
};

describe('createDocumentTheme (FR-40, FR-41)', () => {
  it('applies an explicit theme and contrast, ignoring the system', () => {
    const root = document.createElement('html');
    const { query, flip } = fakeQuery(true);
    createDocumentTheme(root, query).apply('dark', 'hard');
    expect(root.dataset['theme']).toBe('dark');
    expect(root.dataset['contrast']).toBe('hard');
    flip(true);
    expect(root.dataset['theme']).toBe('dark');
  });

  it('follows the system while the theme is system, and stops after an override', () => {
    const root = document.createElement('html');
    const { query, flip } = fakeQuery(false);
    const theme = createDocumentTheme(root, query);
    theme.apply('system', 'soft');
    theme.apply('system', 'soft');
    expect(root.dataset['theme']).toBe('dark');
    flip(true);
    expect(root.dataset['theme']).toBe('light');
    theme.apply('dark', 'soft');
    flip(true);
    expect(root.dataset['theme']).toBe('dark');
  });

  it('defaults to the document root and the window media query', () => {
    const { query } = fakeQuery(true);
    vi.stubGlobal('matchMedia', (q: string) =>
      q === '(prefers-color-scheme: light)' ? query : null,
    );
    createDocumentTheme().apply('system', 'medium');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(document.documentElement.dataset['contrast']).toBe('medium');
  });
});
