import { describe, expect, it } from 'vitest';

import { NULL_CLIPBOARD } from './ports';
import { err } from './result';

describe('NULL_CLIPBOARD', () => {
  it('reports that no clipboard is available', async () => {
    await expect(NULL_CLIPBOARD.writeText('x')).resolves.toEqual(
      err({ kind: 'clipboard-unavailable' }),
    );
  });
});
