import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Providers } from './providers';
import { symbolId } from '../domain/inventory/symbol-id';
import { idsOf, wordFromIds } from '../domain/word/word';
import { useEditor, useServices, useSettings } from '../state/hooks';
import { DEFAULT_SETTINGS } from '../state/settings';

describe('<Providers>', () => {
  it('renders its children', () => {
    render(
      <Providers>
        <p>child</p>
      </Providers>,
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('provides an empty editor and default settings by default', () => {
    const { result } = renderHook(() => ({ editor: useEditor(), settings: useSettings() }), {
      wrapper: Providers,
    });
    expect(result.current.editor.state.word).toEqual([]);
    expect(result.current.settings.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('FR-15: starts from a given word, with the cursor at its end', () => {
    const word = wordFromIds([symbolId('theta'), symbolId('n')]);
    const { result } = renderHook(() => useEditor(), {
      wrapper: ({ children }) => <Providers initialWord={word}>{children}</Providers>,
    });
    expect(idsOf(result.current.state.word)).toEqual(idsOf(word));
    expect(result.current.state.cursor).toBe(2);
  });

  it('refuses to work outside <Providers>', () => {
    expect(() => renderHook(() => useEditor())).toThrow('useEditor must be used inside');
    expect(() => renderHook(() => useSettings())).toThrow('useSettings must be used inside');
    expect(() => renderHook(() => useServices())).toThrow('useServices must be used inside');
  });
});
