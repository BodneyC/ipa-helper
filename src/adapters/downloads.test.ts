import { describe, expect, it, vi } from 'vitest';

import { createBrowserDownloads } from './downloads';

describe('browser downloads (FR-18)', () => {
  it('saves the text through a temporary download link, then frees its URL', async () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    const blobs: Blob[] = [];
    const revokeObjectURL = vi.fn();
    const downloads = createBrowserDownloads({
      createAnchor: () => anchor,
      createObjectURL: (blob) => {
        blobs.push(blob);
        return 'blob:1';
      },
      revokeObjectURL,
    });
    downloads.saveText('words.json', '{}', 'application/json');
    expect(anchor).toMatchObject({ href: 'blob:1', download: 'words.json' });
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:1');
    expect(blobs[0]?.type).toBe('application/json');
    await expect(blobs[0]?.text()).resolves.toBe('{}');
  });

  it('uses the real page by default', () => {
    expect(() => {
      createBrowserDownloads();
    }).not.toThrow();
  });
});
