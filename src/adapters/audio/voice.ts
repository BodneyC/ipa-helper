import { err, ok } from '../../domain/result';
import type { Result } from '../../domain/result';
import type { PhonemeIdMap } from '../../domain/serialise/piper';

/** The pinned Piper voice (ADR-0009); see voice-pin.ts. */
export { VOICE } from './voice-pin';

/** What the runtime needs from the voice's `.onnx.json`. */
export interface VoiceConfig {
  readonly sampleRate: number;
  /** Piper's `scales` input: noise, length, noise_w. */
  readonly scales: readonly [noise: number, length: number, noiseW: number];
  readonly idMap: PhonemeIdMap;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isIdMap = (value: unknown): value is PhonemeIdMap =>
  isRecord(value) &&
  Object.values(value).every(
    (ids) => Array.isArray(ids) && ids.every((id) => typeof id === 'number'),
  );

/** Reads a voice's `.onnx.json` from untrusted JSON. */
export const parseVoiceConfig = (json: unknown): Result<VoiceConfig, string> => {
  if (!isRecord(json) || !isRecord(json['audio']) || !isRecord(json['inference'])) {
    return err('voice config: missing audio or inference section');
  }
  const rate = json['audio']['sample_rate'];
  const { noise_scale: noise, length_scale: length, noise_w: noiseW } = json['inference'];
  const map = json['phoneme_id_map'];
  if (
    typeof rate !== 'number' ||
    typeof noise !== 'number' ||
    typeof length !== 'number' ||
    typeof noiseW !== 'number' ||
    !isIdMap(map)
  ) {
    return err('voice config: unexpected shape');
  }
  return ok({ sampleRate: rate, scales: [noise, length, noiseW], idMap: map });
};
