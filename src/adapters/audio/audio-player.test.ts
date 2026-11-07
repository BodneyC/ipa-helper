import { describe, expect, it, vi } from 'vitest';

import { createAudioPlayer } from './audio-player';
import type { ClipSource, WordClip, WordSource } from './audio-player';
import type { AudioClip, AudioOutput } from './web-audio-output';
import { symbolId } from '../../domain/inventory/symbol-id';
import type { AudioError } from '../../domain/ports';
import { err, ok } from '../../domain/result';
import type { Result } from '../../domain/result';
import { wordFromIds } from '../../domain/word/word';

const CLIP: AudioClip = { kind: 'encoded', data: new ArrayBuffer(1) };
const ESH = symbolId('esh');

const fakeOutput = (supported = true) => {
  const play = vi.fn<AudioOutput['play']>(() => Promise.resolve(ok(undefined)));
  const output: AudioOutput = { supported, play };
  return { output, play };
};

/** A source whose answers the test hands out one at a time. */
const deferredSource = <K>() => {
  const pending: ((result: Result<AudioClip, AudioError>) => void)[] = [];
  const source = vi.fn<ClipSource<K>>(
    () =>
      new Promise((resolve) => {
        pending.push(resolve);
      }),
  );
  const answer = (result: Result<AudioClip, AudioError>) => {
    pending.shift()?.(result);
  };
  return { source, answer };
};

describe('audio player', () => {
  it('FR-30: plays a symbol clip from its source through the output', async () => {
    const { output, play } = fakeOutput();
    const symbols = vi.fn<ClipSource<typeof ESH>>(() => Promise.resolve(ok(CLIP)));
    const player = createAudioPlayer({ output, symbols });
    await expect(player.playSymbol(ESH)).resolves.toEqual(ok(undefined));
    expect(symbols).toHaveBeenCalledWith(ESH, expect.any(Function));
    expect(play).toHaveBeenCalledWith(CLIP);
  });

  it('FR-31: plays a word from its source through the output, and says what it left out', async () => {
    const { output, play } = fakeOutput();
    const word = wordFromIds([ESH]);
    const dropped = [symbolId('creaky-voiced')];
    const words = vi.fn<WordSource>(() => Promise.resolve(ok({ clip: CLIP, dropped })));
    const player = createAudioPlayer({ output, words });
    await expect(player.playWord(word)).resolves.toEqual(ok({ dropped }));
    expect(words).toHaveBeenCalledWith(word, expect.any(Function));
    expect(play).toHaveBeenCalledWith(CLIP);
  });

  it('ADR-0012: can play only the symbols its clip source covers', () => {
    const symbols = vi.fn<ClipSource<typeof ESH>>(() => Promise.resolve(ok(CLIP)));
    const output = fakeOutput().output;
    const covered = createAudioPlayer({ output, symbols, symbolIds: new Set([ESH]) });
    expect(covered.canPlaySymbol(ESH)).toBe(true);
    expect(covered.canPlaySymbol(symbolId('c-cedilla'))).toBe(false);
    expect(createAudioPlayer({ output, symbols }).canPlaySymbol(symbolId('c-cedilla'))).toBe(true);
    expect(createAudioPlayer({ output }).canPlaySymbol(ESH)).toBe(false);
  });

  it('reports channels without a source, or without Web Audio, as unsupported', async () => {
    const unsupported = err({ kind: 'audio-unsupported' });
    const noSources = createAudioPlayer({ output: fakeOutput().output });
    expect(noSources.status).toEqual({ symbols: 'unsupported', words: 'unsupported' });
    await expect(noSources.playSymbol(ESH)).resolves.toEqual(unsupported);
    await expect(noSources.playWord([])).resolves.toEqual(unsupported);

    const symbols = vi.fn<ClipSource<typeof ESH>>(() => Promise.resolve(ok(CLIP)));
    const noWebAudio = createAudioPlayer({ output: fakeOutput(false).output, symbols });
    expect(noWebAudio.status.symbols).toBe('unsupported');
    await expect(noWebAudio.playSymbol(ESH)).resolves.toEqual(unsupported);
    expect(symbols).not.toHaveBeenCalled();
  });

  it('FR-33: a channel goes idle → loading → ready on its first sound, and stays ready', async () => {
    const { source, answer } = deferredSource<typeof ESH>();
    const player = createAudioPlayer({ output: fakeOutput().output, symbols: source });
    const listener = vi.fn();
    player.subscribe(listener);
    expect(player.status).toEqual({ symbols: 'idle', words: 'unsupported' });

    const first = player.playSymbol(ESH);
    expect(player.status.symbols).toBe('loading');
    answer(ok(CLIP));
    await first;
    expect(player.status.symbols).toBe('ready');

    const second = player.playSymbol(ESH);
    expect(player.status.symbols).toBe('ready');
    answer(ok(CLIP));
    await second;
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('FR-33: a failed first load returns to idle once nothing is in flight, so it can retry', async () => {
    const { source, answer } = deferredSource<typeof ESH>();
    const { output, play } = fakeOutput();
    const player = createAudioPlayer({ output, symbols: source });
    const failure = err({ kind: 'audio-load-failed' as const });

    const a = player.playSymbol(ESH);
    const b = player.playSymbol(ESH);
    answer(failure);
    await expect(a).resolves.toEqual(failure);
    expect(player.status.symbols).toBe('loading');
    answer(failure);
    await expect(b).resolves.toEqual(failure);
    expect(player.status.symbols).toBe('idle');
    expect(play).not.toHaveBeenCalled();
  });

  it('a failure after the channel is ready leaves it ready', async () => {
    const { source, answer } = deferredSource<typeof ESH>();
    const player = createAudioPlayer({ output: fakeOutput().output, symbols: source });
    const first = player.playSymbol(ESH);
    answer(ok(CLIP));
    await first;
    const second = player.playSymbol(ESH);
    answer(err({ kind: 'audio-load-failed' }));
    await second;
    expect(player.status.symbols).toBe('ready');
  });

  it('replaces the status snapshot on change and stops notifying after unsubscribe', async () => {
    const symbols = vi.fn<ClipSource<typeof ESH>>(() => Promise.resolve(ok(CLIP)));
    const player = createAudioPlayer({ output: fakeOutput().output, symbols });
    const before = player.status;
    const listener = vi.fn();
    const unsubscribe = player.subscribe(listener);
    unsubscribe();
    await player.playSymbol(ESH);
    expect(listener).not.toHaveBeenCalled();
    expect(player.status).not.toBe(before);
    expect(before.symbols).toBe('idle');
  });

  it('passes on what the output reports', async () => {
    const failed = err({ kind: 'audio-playback-failed' as const });
    const output: AudioOutput = { supported: true, play: () => Promise.resolve(failed) };
    const symbols = vi.fn<ClipSource<typeof ESH>>(() => Promise.resolve(ok(CLIP)));
    const player = createAudioPlayer({ output, symbols });
    await expect(player.playSymbol(ESH)).resolves.toEqual(failed);
  });

  it('FR-33: reports a loading channel’s download progress, clamped, and clears it once ready', async () => {
    let report: (fraction: number) => void = () => undefined;
    let finish: (result: Result<WordClip, AudioError>) => void = () => undefined;
    const words = vi.fn<WordSource>(
      (_word, onProgress) =>
        new Promise((resolve) => {
          report = onProgress ?? (() => undefined);
          finish = resolve;
        }),
    );
    const player = createAudioPlayer({ output: fakeOutput().output, words });
    const listener = vi.fn();
    player.subscribe(listener);
    expect(player.progress.words).toBeUndefined();

    const playing = player.playWord(wordFromIds([ESH]));
    report(0.25);
    expect(player.progress).toEqual({ symbols: undefined, words: 0.25 });
    report(0.25);
    report(1.4);
    expect(player.progress.words).toBe(1);
    report(-1);
    expect(player.progress.words).toBe(0);
    finish(ok({ clip: CLIP, dropped: [] }));
    await playing;
    expect(player.status.words).toBe('ready');
    expect(player.progress.words).toBeUndefined();
    // loading, 0.25, 1, 0, ready: the repeated 0.25 changed nothing.
    expect(listener).toHaveBeenCalledTimes(5);

    // Once ready, progress from a later load is ignored.
    const again = player.playWord(wordFromIds([ESH]));
    report(0.5);
    expect(player.progress.words).toBeUndefined();
    finish(ok({ clip: CLIP, dropped: [] }));
    await again;
  });
});
