import { err, ok } from '../../domain/result';
import type { Result } from '../../domain/result';
import type { PhonemeIdMap } from '../../domain/serialise/piper';

/**
 * The pinned Piper voice (ADR-0009): Cori (medium) at a fixed revision of
 * rhasspy/piper-voices. `pnpm voice:fetch` downloads the model, checks its
 * SHA-256 and serves it as `public/voice/<servedAs>`; the 8-hex suffix changes
 * with the model, so a cached copy never goes stale. The config is committed
 * (`src/assets/voice/`).
 */
export const VOICE = {
  name: 'en_GB-cori-medium',
  revision: 'e7229f7d33a10e145e109b886d661984201ac3c4',
  model: {
    name: 'en_GB-cori-medium.onnx',
    sha256: '1899f98e5fb8310154f3c2973f4b8a929ba7245e722b3d3a85680b833d95f10d',
    bytes: 63_531_379,
    servedAs: 'en_GB-cori-medium.1899f98e.onnx',
  },
  config: {
    name: 'en_GB-cori-medium.onnx.json',
    sha256: 'e262c16d7f192f69d4edd6b4ef8a5915379e67495fcc402f1ab15eeb33da3d36',
  },
} as const;

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
