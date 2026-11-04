import { describe, expect, it } from 'vitest';

import { NULL_CLIPBOARD, NULL_FRAGMENTS } from './ports';
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
