import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { URL_WRITE_DELAY_MS, UrlSync, readInitialWord } from './UrlSync';
import { Providers } from '../../../app/providers';
import { symbolId } from '../../../domain/inventory/symbol-id';
import type { FragmentStore } from '../../../domain/ports';
import { idsOf, wordFromIds } from '../../../domain/word/word';
import { useEditor } from '../../../state/hooks';

/** An in-memory fragment store; `navigate` simulates the user changing the URL. */
const fakeFragments = (initial: string) => {
  let fragment = initial;
  let listener: ((f: string) => void) | undefined;
  const store: FragmentStore = {
    read: () => fragment,
    write: vi.fn((next: string) => {
      fragment = next;
    }),
    subscribe: (l) => {
      listener = l;
      return () => {
        listener = undefined;
      };
    },
  };
  const navigate = (next: string) => {
    fragment = next;
    act(() => {
      listener?.(next);
    });
  };
  return { store, navigate, current: () => fragment };
};

type Editor = ReturnType<typeof useEditor>;
let editor: Editor | undefined;
const capture = (store: Editor) => {
  editor = store;
};
/** Hands the editor store to the test after each render. */
function Probe({ onEditor }: { readonly onEditor: (store: Editor) => void }) {
  const store = useEditor();
  useEffect(() => {
    onEditor(store);
  });
  return null;
}

const mount = (initial: string) => {
  const fragments = fakeFragments(initial);
  render(
    <Providers
      services={{ clipboard: { writeText: vi.fn() }, fragments: fragments.store }}
      initialWord={readInitialWord(fragments.store)}
    >
      <UrlSync />
      <Probe onEditor={capture} />
    </Providers>,
  );
  return fragments;
};

const wordIds = () => (editor ? idsOf(editor.state.word) : []);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  editor = undefined;
});

describe('<UrlSync>', () => {
  it('FR-15: a shared link restores its word', () => {
    mount('w=1:theta.open-o-long.n');
    expect(wordIds()).toEqual(['theta', 'open-o-long', 'n']);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('FR-15: writes edits back to the fragment, debounced', () => {
    const fragments = mount('');
    act(() => {
      editor?.dispatch({ type: 'insert', symbolId: symbolId('p') });
      editor?.dispatch({ type: 'insert', symbolId: symbolId('ash') });
    });
    expect(fragments.current()).toBe('');
    act(() => {
      vi.advanceTimersByTime(URL_WRITE_DELAY_MS);
    });
    expect(fragments.current()).toBe('w=1:p.ash');
  });

  it('FR-15: an invalid link is ignored with a dismissible notice', () => {
    mount('w=1:theta.bogus');
    expect(wordIds()).toEqual([]);
    expect(screen.getByRole('status')).toHaveTextContent('doesn’t know (“bogus”)');
    act(() => {
      screen.getByRole('button', { name: 'Dismiss' }).click();
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    ['w=theta', 'couldn’t be read'],
    ['w=2:theta', 'newer version'],
  ])('FR-15: explains why %j was ignored', (fragment, text) => {
    mount(fragment);
    expect(screen.getByRole('status')).toHaveTextContent(text);
  });

  it('FR-15: follows a fragment the user changes, as one undoable edit', () => {
    const fragments = mount('w=1:p');
    fragments.navigate('w=1:k.ash.t');
    expect(wordIds()).toEqual(['k', 'ash', 't']);
    act(() => {
      editor?.dispatch({ type: 'undo' });
    });
    expect(wordIds()).toEqual(['p']);
  });

  it('ignores a fragment change that matches the current word', () => {
    const fragments = mount('w=1:p');
    fragments.navigate('w=1:p');
    expect(editor?.state.past).toEqual([]);
  });

  it('FR-15: shows a notice for a bad fragment the user navigates to, and clears it on a good one', () => {
    const fragments = mount('w=1:p');
    fragments.navigate('w=1:nope');
    expect(screen.getByRole('status')).toHaveTextContent('nope');
    expect(wordIds()).toEqual(['p']);
    fragments.navigate('w=1:n');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reads the empty word from a store with no fragment', () => {
    expect(readInitialWord(fakeFragments('').store)).toEqual([]);
    expect(readInitialWord(fakeFragments('w=1:bad').store)).toEqual([]);
    expect(idsOf(readInitialWord(fakeFragments('w=1:n').store))).toEqual(
      idsOf(wordFromIds([symbolId('n')])),
    );
  });
});
