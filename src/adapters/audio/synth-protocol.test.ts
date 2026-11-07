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
    const audio = { type: 'audio', id: 1, samples: new Float32Array(2), sampleRate: 22050 };
    expect(isSynthReply({ ...audio, dropped: [] })).toBe(true);
    expect(isSynthReply({ ...audio, dropped: ['creaky-voiced'] })).toBe(true);
    expect(isSynthReply(audio)).toBe(false);
    expect(isSynthReply({ ...audio, dropped: ['Not an ID'] })).toBe(false);
    expect(isSynthReply({ ...audio, dropped: [1] })).toBe(false);
    expect(isSynthReply({ ...audio, samples: [0], dropped: [] })).toBe(false);
    expect(isSynthReply({ type: 'error', id: 1, kind: 'audio-load-failed' })).toBe(true);
    expect(isSynthReply({ type: 'error', id: 1, kind: 'nope' })).toBe(false);
    expect(isSynthReply({ type: 'other' })).toBe(false);
    expect(isSynthReply('progress')).toBe(false);
  });
});
