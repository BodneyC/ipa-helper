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

  describe('theme-color (#5)', () => {
    /** An <html> with the build's two theme-color metas. */
    const page = () => {
      const root = document.createElement('html');
      const head = root.appendChild(document.createElement('head'));
      for (const [scheme, colour] of [
        ['dark', 'dark-bg'],
        ['light', 'light-bg'],
      ] as const) {
        const meta = head.appendChild(document.createElement('meta'));
        meta.name = 'theme-color';
        meta.media = `(prefers-color-scheme: ${scheme})`;
        meta.content = colour;
      }
      const colours = () =>
        [...root.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map(
          (m) => m.content,
        );
      return { root, colours };
    };
    /** Stands in for the tokens: the background each theme and contrast gives. */
    const tokens = (root: HTMLElement) =>
      `${root.dataset['theme'] ?? '?'}-${root.dataset['contrast'] ?? '?'}-bg`;

    it('gives both metas the active background when the theme is dark or light', () => {
      const { root, colours } = page();
      const theme = createDocumentTheme(root, fakeQuery(false).query, tokens);
      theme.apply('light', 'medium');
      expect(colours()).toEqual(['light-medium-bg', 'light-medium-bg']);
      theme.apply('dark', 'hard');
      expect(colours()).toEqual(['dark-hard-bg', 'dark-hard-bg']);
    });

    it("restores the build's per-scheme colours for system", () => {
      const { root, colours } = page();
      const theme = createDocumentTheme(root, fakeQuery(true).query, tokens);
      theme.apply('system', 'medium');
      expect(colours()).toEqual(['dark-bg', 'light-bg']);
      theme.apply('dark', 'medium');
      theme.apply('light', 'soft');
      theme.apply('system', 'medium');
      expect(colours()).toEqual(['dark-bg', 'light-bg']);
    });

    it('leaves the metas alone when the tokens give no background', () => {
      const { root, colours } = page();
      createDocumentTheme(root, fakeQuery(false).query, () => '').apply('light', 'medium');
      expect(colours()).toEqual(['dark-bg', 'light-bg']);
    });

    it('reads the background from the --color-bg token by default', () => {
      const { root, colours } = page();
      root.style.setProperty('--color-bg', ' token-bg ');
      createDocumentTheme(root, fakeQuery(false).query).apply('dark', 'medium');
      expect(colours()).toEqual(['token-bg', 'token-bg']);
    });
  });
});
