import { describe, expect, it } from 'vitest';

import { symbolId } from './inventory/symbol-id';
import { NULL_AUDIO, NULL_CLIPBOARD, NULL_FRAGMENTS, NULL_STORE, NULL_THEME } from './ports';
import { err } from './result';

describe('NULL_CLIPBOARD', () => {
  it('reports that no clipboard is available', async () => {
    await expect(NULL_CLIPBOARD.writeText('x')).resolves.toEqual(
      err({ kind: 'clipboard-unavailable' }),
    );
  });
});

describe('NULL_FRAGMENTS', () => {
  it('is always empty and ignores writes and subscriptions', () => {
    NULL_FRAGMENTS.write('w=1:theta');
    expect(NULL_FRAGMENTS.read()).toBe('');
    const unsubscribe = NULL_FRAGMENTS.subscribe(() => undefined);
    expect(unsubscribe).not.toThrow();
  });
});

describe('NULL_STORE', () => {
  it('remembers nothing', () => {
    NULL_STORE.set('k', 'v');
    expect(NULL_STORE.get('k')).toBeUndefined();
  });
});

describe('NULL_THEME', () => {
  it('ignores themes', () => {
    expect(() => {
      NULL_THEME.apply('dark', 'hard');
    }).not.toThrow();
  });
});

describe('NULL_AUDIO', () => {
  it('is unsupported on both channels and never plays', async () => {
    expect(NULL_AUDIO.status).toEqual({ symbols: 'unsupported', words: 'unsupported' });
    expect(NULL_AUDIO.subscribe(() => undefined)).not.toThrow();
    const unsupported = err({ kind: 'audio-unsupported' });
    await expect(NULL_AUDIO.playSymbol(symbolId('esh'))).resolves.toEqual(unsupported);
    await expect(NULL_AUDIO.playWord([])).resolves.toEqual(unsupported);
  });
});
