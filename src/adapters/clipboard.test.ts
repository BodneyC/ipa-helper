import { describe, expect, it, vi } from 'vitest';

import { createBrowserClipboard } from './clipboard';
import { err, ok } from '../domain/result';

const fakeClipboard = (writeText: (text: string) => Promise<void>) => ({ writeText });

describe('browser clipboard adapter', () => {
  it('writes text and reports success', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const clipboard = createBrowserClipboard(fakeClipboard(writeText));
    await expect(clipboard.writeText('"TO:nIk')).resolves.toEqual(ok(undefined));
    expect(writeText).toHaveBeenCalledWith('"TO:nIk');
  });

  it('reports a refused write', async () => {
    const clipboard = createBrowserClipboard(fakeClipboard(() => Promise.reject(new Error('no'))));
    await expect(clipboard.writeText('x')).resolves.toEqual(err({ kind: 'clipboard-denied' }));
  });

  it('reports a missing Clipboard API', async () => {
    await expect(createBrowserClipboard(undefined).writeText('x')).resolves.toEqual(
      err({ kind: 'clipboard-unavailable' }),
    );
  });

  it('uses navigator.clipboard by default', () => {
    expect(createBrowserClipboard()).toHaveProperty('writeText');
  });
});
