import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseVoiceConfig, VOICE } from './voice';
import { SYMBOLS, symbolsIn } from '../../domain/inventory/index';
import { piperPhonemeIds } from '../../domain/serialise/piper';

const configPath = join(import.meta.dirname, '..', '..', 'assets', 'voice', VOICE.config.name);
const bytes = readFileSync(configPath);
const parsed = parseVoiceConfig(JSON.parse(bytes.toString('utf8')));

describe('pinned voice (ADR-0009)', () => {
  it('commits the config byte for byte as pinned', () => {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(VOICE.config.sha256);
  });

  it('FR-31: can say every RP symbol, and every mark and ending the serialiser writes', () => {
    expect(parsed.ok).toBe(true);
    const map = parsed.ok ? parsed.value.idMap : {};
    const needed = new Set([
      ...symbolsIn('rp').flatMap((s) => Array.from(s.ipa)),
      ...['^', '_', '$', ' ', '.', '!'],
    ]);
    // Syllable breaks are dropped before the voice sees them; '.' is needed anyway as an ending.
    expect([...needed].filter((c) => map[c] === undefined)).toEqual([]);
  });

  it('#15: says ʰ ʲ ˤ ˞ and six combining marks, and leaves out every other diacritic', () => {
    const map = parsed.ok ? parsed.value.idMap : {};
    const marks = SYMBOLS.filter((s) => s.category === 'diacritic');
    const result = piperPhonemeIds(`a${marks.map((m) => m.ipa).join('')}!`, map);
    const said = marks.filter((m) => result.ok && !result.value.dropped.includes(m.id));
    // prettier-ignore
    expect(said.map((m) => m.id)).toEqual([
      'aspirated', 'syllabic', 'non-syllabic', 'rhoticity', 'palatalised', 'pharyngealised',
      'dental', 'apical', 'laminal', 'nasalised',
    ]);
    expect(result.ok && result.value.dropped).toHaveLength(marks.length - said.length);
  });

  it('reads the sample rate and scales the worker needs', () => {
    expect(parsed).toMatchObject({
      ok: true,
      value: { sampleRate: 22050, scales: [0.667, 1, 0.8] },
    });
  });

  it('rejects malformed configs', () => {
    expect(parseVoiceConfig(null).ok).toBe(false);
    expect(parseVoiceConfig({ audio: {}, inference: {} }).ok).toBe(false);
    expect(
      parseVoiceConfig({
        audio: { sample_rate: 22050 },
        inference: { noise_scale: 1, length_scale: 1, noise_w: 1 },
        phoneme_id_map: { a: ['x'] },
      }).ok,
    ).toBe(false);
  });
});
