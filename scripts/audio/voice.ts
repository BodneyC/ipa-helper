// Fetches, verifies and runs the Piper voice, and encodes its output (M4.3, ADR-0009).
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import * as ort from 'onnxruntime-web';

import { parseVoiceConfig, VOICE } from '../../src/adapters/audio/voice';
import type { VoiceConfig } from '../../src/adapters/audio/voice';
import { piperPhonemeIds } from '../../src/domain/serialise/piper';

/** The repository root. */
export const ROOT = join(import.meta.dirname, '..', '..');
/** Downloads and renders that are never committed. */
export const CACHE = join(ROOT, '.cache');

/** The runtime the clips are rendered with; the same one the browser uses for words (M5.2). */
export const RUNTIME = `onnxruntime-web ${ort.env.versions.web ?? 'unknown'}, wasm, 1 thread`;

/** How clips are encoded. Speech needs little bandwidth; 48 kHz is Opus's native rate. */
export const ENCODING = {
  codec: 'libopus',
  container: 'ogg',
  bitrate: '32k',
  sampleRate: 48000,
} as const;

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Downloads a pinned voice file into .cache/ (or reuses it), checking its SHA-256. */
export const fetchVerified = async (file: { readonly name: string; readonly sha256: string }) => {
  const dir = join(CACHE, 'piper', VOICE.revision);
  const path = join(dir, file.name);
  if (existsSync(path) && sha256(readFileSync(path)) === file.sha256) return path;
  const url = `https://huggingface.co/rhasspy/piper-voices/resolve/${VOICE.revision}/en/en_GB/cori/medium/${file.name}`;
  console.log(`Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${String(response.status)}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actual = sha256(bytes);
  if (actual !== file.sha256) {
    throw new Error(`${file.name}: SHA-256 ${actual}, expected ${file.sha256}`);
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, bytes);
  return path;
};

/** Turns voice text into PCM samples. */
export interface Synthesiser {
  readonly sampleRate: number;
  readonly scales: VoiceConfig['scales'];
  /** `scales` overrides the voice's own [noise, length, noise_w]. */
  synthesise(text: string, scales?: VoiceConfig['scales']): Promise<Float32Array>;
}

/** Fetches (or reuses) the verified voice and starts an onnxruntime session for it. */
export const loadVoice = async (): Promise<Synthesiser> => {
  const modelPath = await fetchVerified(VOICE.model);
  const configPath = await fetchVerified(VOICE.config);
  const parsed = parseVoiceConfig(JSON.parse(readFileSync(configPath, 'utf8')));
  if (!parsed.ok) throw new Error(parsed.error);
  const config = parsed.value;
  ort.env.wasm.numThreads = 1;
  const session = await ort.InferenceSession.create(readFileSync(modelPath), {
    executionProviders: ['wasm'],
  });
  return {
    sampleRate: config.sampleRate,
    scales: config.scales,
    synthesise: async (text, scales = config.scales) => {
      const encoded = piperPhonemeIds(text, config.idMap);
      if (!encoded.ok) throw new Error(`"${text}": the voice has no ${encoded.error.join(' ')}`);
      const { ids } = encoded.value;
      const out = await session.run({
        input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
        input_lengths: new ort.Tensor('int64', BigInt64Array.of(BigInt(ids.length)), [1]),
        scales: new ort.Tensor('float32', Float32Array.from(scales), [3]),
      });
      const data = out['output']?.data;
      if (!(data instanceof Float32Array)) throw new Error(`"${text}": no float32 output`);
      return data;
    },
  };
};

const ffmpegPath = (): string => {
  const path: unknown = createRequire(import.meta.url)('ffmpeg-static');
  if (typeof path !== 'string' || !existsSync(path)) {
    throw new Error(
      'ffmpeg-static has no binary; run `pnpm install` (its build script must be allowed)',
    );
  }
  return path;
};

/**
 * Encodes mono float PCM as Ogg Opus. `-fflags +bitexact` fixes the Ogg stream
 * serial and drops the encoder tag, so the same samples give the same bytes.
 */
export const encodeOpus = (samples: Float32Array, sampleRate: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath(), [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'f32le',
      '-ar',
      String(sampleRate),
      '-ac',
      '1',
      '-i',
      'pipe:0',
      '-c:a',
      ENCODING.codec,
      '-b:a',
      ENCODING.bitrate,
      '-ar',
      String(ENCODING.sampleRate),
      '-application',
      'voip',
      '-map_metadata',
      '-1',
      '-fflags',
      '+bitexact',
      '-flags:a',
      '+bitexact',
      '-f',
      ENCODING.container,
      'pipe:1',
    ]);
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`ffmpeg exited ${String(code)}: ${Buffer.concat(errors).toString()}`));
    });
    ffmpeg.stdin.end(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
  });

/** Hex SHA-256 of some bytes. */
export { sha256 };

/** Re-exported for the entry scripts. */
export { VOICE };
