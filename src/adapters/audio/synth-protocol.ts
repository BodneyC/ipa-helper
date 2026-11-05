import type { AudioError } from '../../domain/ports';

/** Main thread → synthesis worker (M5.2). */
export interface SynthRequest {
  readonly type: 'synthesise';
  /** Matches the reply to its request. */
  readonly id: number;
  /** Voice text from `piperPhonemeSerialiser`. */
  readonly text: string;
  /** Absolute URLs: a worker resolves relative ones against its own script. */
  readonly modelUrl: string;
  readonly configUrl: string;
}

/** Synthesis worker → main thread. */
export type SynthReply =
  /** How much of the model has arrived, 0–1. Sent to every listener while loading. */
  | { readonly type: 'progress'; readonly fraction: number }
  | {
      readonly type: 'audio';
      readonly id: number;
      readonly samples: Float32Array;
      readonly sampleRate: number;
    }
  | { readonly type: 'error'; readonly id: number; readonly kind: AudioError['kind'] };

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

/** Checks a message the worker received. */
export const isSynthRequest = (value: unknown): value is SynthRequest =>
  isRecord(value) &&
  value['type'] === 'synthesise' &&
  typeof value['id'] === 'number' &&
  typeof value['text'] === 'string' &&
  typeof value['modelUrl'] === 'string' &&
  typeof value['configUrl'] === 'string';

const ERROR_KINDS: readonly unknown[] = [
  'audio-unsupported',
  'audio-load-failed',
  'audio-playback-failed',
] satisfies readonly AudioError['kind'][];

/** Checks a message the main thread received. */
export const isSynthReply = (value: unknown): value is SynthReply => {
  if (!isRecord(value)) return false;
  switch (value['type']) {
    case 'progress':
      return typeof value['fraction'] === 'number';
    case 'audio':
      return (
        typeof value['id'] === 'number' &&
        value['samples'] instanceof Float32Array &&
        typeof value['sampleRate'] === 'number'
      );
    case 'error':
      return typeof value['id'] === 'number' && ERROR_KINDS.includes(value['kind']);
    default:
      return false;
  }
};
