import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { missingVoiceWarning } from './dev-plugin';
import { VOICE } from '../../src/adapters/audio/voice';

describe('voice model check (ADR-0009)', () => {
  it('says to run voice:fetch when the model is missing, and nothing once it is there', () => {
    const publicDir = mkdtempSync(join(tmpdir(), 'ipa-voice-'));
    expect(missingVoiceWarning(publicDir)).toMatch(/Run: pnpm voice:fetch$/);
    mkdirSync(join(publicDir, 'voice'));
    writeFileSync(join(publicDir, 'voice', VOICE.model.servedAs), '');
    expect(missingVoiceWarning(publicDir)).toBeUndefined();
  });
});
