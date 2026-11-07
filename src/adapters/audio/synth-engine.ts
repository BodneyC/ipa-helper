import type { AudioCache } from './cache';
import { parseVoiceConfig } from './voice';
import type { VoiceConfig } from './voice';
import type { SymbolId } from '../../domain/inventory/symbol-id';
import type { AudioError } from '../../domain/ports';
import { err, ok } from '../../domain/result';
import type { Result } from '../../domain/result';
import { piperPhonemeIds } from '../../domain/serialise/piper';

/** A loaded voice model: phoneme IDs and scales in, PCM samples out. */
export interface SynthSession {
  run(ids: readonly number[], scales: VoiceConfig['scales']): Promise<Float32Array>;
}

/** What the engine needs from its surroundings; the worker passes the real ones. */
export interface SynthDeps {
  readonly fetch: (url: string) => Promise<Response>;
  readonly openCache: () => Promise<AudioCache | undefined>;
  readonly createSession: (model: Uint8Array) => Promise<SynthSession>;
  /** The model's size in bytes, for progress when the server sends no usable length. */
  readonly modelBytes: number;
}

interface Voice {
  readonly session: SynthSession;
  readonly config: VoiceConfig;
}

/** Synthesised speech. */
export interface Speech {
  readonly samples: Float32Array;
  readonly sampleRate: number;
  /** Diacritics the voice had no sound for, so left out (#15). */
  readonly dropped: readonly SymbolId[];
}

const loadFailed = err({ kind: 'audio-load-failed' as const });

/**
 * The synthesis engine that runs inside the worker (M5.2, ARCHITECTURE §8).
 * It loads the voice on the first request: the config, then the model, from
 * the Cache API when it is there (FR-33) and otherwise streamed from the
 * network with progress. A failed load is forgotten, so the next request
 * retries.
 */
export const createSynthEngine = (deps: SynthDeps) => {
  let voice: Promise<Result<Voice, AudioError>> | undefined;

  const readModel = async (url: string, onProgress: (fraction: number) => void) => {
    const cache = await deps.openCache();
    try {
      const hit = await cache?.match(url);
      if (hit !== undefined) {
        const bytes = new Uint8Array(await hit.arrayBuffer());
        onProgress(1);
        return bytes;
      }
    } catch {
      // A broken cache is only a missed shortcut: fall through to the network.
    }
    const response = await deps.fetch(url);
    if (!response.ok || response.body === null)
      throw new Error(`model: HTTP ${String(response.status)}`);
    // The decompressed stream is what arrives here, so measure against the
    // model's real size rather than a (possibly compressed) Content-Length.
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress(Math.min(1, loaded / deps.modelBytes));
    }
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    // Best effort: quota or private mode must not stop synthesis.
    await cache?.put(url, new Response(bytes)).catch(() => undefined);
    return bytes;
  };

  const load = async (
    modelUrl: string,
    configUrl: string,
    onProgress: (fraction: number) => void,
  ): Promise<Result<Voice, AudioError>> => {
    try {
      const configResponse = await deps.fetch(configUrl);
      if (!configResponse.ok) return loadFailed;
      const config = parseVoiceConfig(await configResponse.json());
      if (!config.ok) return loadFailed;
      const session = await deps.createSession(await readModel(modelUrl, onProgress));
      return ok({ session, config: config.value });
    } catch {
      return loadFailed;
    }
  };

  return {
    /** Speaks voice text (from `piperPhonemeSerialiser`). */
    synthesise: async (
      request: { readonly text: string; readonly modelUrl: string; readonly configUrl: string },
      onProgress: (fraction: number) => void,
    ): Promise<Result<Speech, AudioError>> => {
      voice ??= load(request.modelUrl, request.configUrl, onProgress);
      const loaded = await voice;
      if (!loaded.ok) {
        voice = undefined;
        return loaded;
      }
      const { session, config } = loaded.value;
      const ids = piperPhonemeIds(request.text, config.idMap);
      // Every RP codepoint is in the voice's map (a unit test checks), so this
      // only fails for text the voice can't say. Marks it can't say are dropped.
      if (!ids.ok) return err({ kind: 'audio-unsupported' });
      try {
        const samples = await session.run(ids.value.ids, config.scales);
        return ok({ samples, sampleRate: config.sampleRate, dropped: ids.value.dropped });
      } catch {
        return err({ kind: 'audio-playback-failed' });
      }
    },
  };
};
