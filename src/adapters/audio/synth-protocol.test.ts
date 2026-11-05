import { describe, expect, it } from 'vitest';

import { isSynthReply, isSynthRequest } from './synth-protocol';

describe('synthesis worker protocol', () => {
  it('accepts well-formed requests only', () => {
    const request = { type: 'synthesise', id: 1, text: 'æ!', modelUrl: 'm', configUrl: 'c' };
    expect(isSynthRequest(request)).toBe(true);
    expect(isSynthRequest({ ...request, id: '1' })).toBe(false);
    expect(isSynthRequest(null)).toBe(false);
  });

  it('accepts well-formed replies only', () => {
    expect(isSynthReply({ type: 'progress', fraction: 0.5 })).toBe(true);
    expect(isSynthReply({ type: 'progress' })).toBe(false);
    expect(
      isSynthReply({ type: 'audio', id: 1, samples: new Float32Array(2), sampleRate: 22050 }),
    ).toBe(true);
    expect(isSynthReply({ type: 'audio', id: 1, samples: [0], sampleRate: 22050 })).toBe(false);
    expect(isSynthReply({ type: 'error', id: 1, kind: 'audio-load-failed' })).toBe(true);
    expect(isSynthReply({ type: 'error', id: 1, kind: 'nope' })).toBe(false);
    expect(isSynthReply({ type: 'other' })).toBe(false);
    expect(isSynthReply('progress')).toBe(false);
  });
});
