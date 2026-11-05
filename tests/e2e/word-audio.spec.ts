import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

declare global {
  interface Window {
    /** Every message the app sent a worker, and every worker it made. */
    __synthRequests?: unknown[];
    __workers?: Worker[];
    /** Durations (s) of every buffer the app started playing. */
    __played?: number[];
  }
}

/**
 * Stands in for the synthesis worker (M5.3): no 63.5 MB model, no runtime. It
 * reports half the download, then waits for the test to `release` (answer
 * with 0.4 s of tone) or `fail` (answer with a load error). Each later word is
 * answered straight away, as the real worker does once the voice is loaded.
 */
const FAKE_WORKER = `
let pending = [];
let ready = false;
const tone = () => {
  const samples = new Float32Array(8820);
  for (let i = 0; i < samples.length; i++) samples[i] = 0.2 * Math.sin((2 * Math.PI * 440 * i) / 22050);
  return samples;
};
const answer = (id) => {
  const samples = tone();
  self.postMessage({ type: 'audio', id, samples, sampleRate: 22050 }, [samples.buffer]);
};
self.onmessage = ({ data }) => {
  if (data.type === 'synthesise') {
    if (ready) return answer(data.id);
    pending.push(data.id);
    self.postMessage({ type: 'progress', fraction: 0.5 });
  } else if (data.type === 'release') {
    ready = true;
    pending.forEach(answer);
    pending = [];
  } else if (data.type === 'fail') {
    for (const id of pending) self.postMessage({ type: 'error', id, kind: 'audio-load-failed' });
    pending = [];
  }
};
`;

const setUp = async (page: Page) => {
  await page.route('**/synth.worker-*.js', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: FAKE_WORKER }),
  );
  await page.addInitScript(() => {
    window.__synthRequests = [];
    window.__workers = [];
    window.__played = [];
    const RealWorker = window.Worker;
    window.Worker = class extends RealWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        window.__workers?.push(this);
      }
      override postMessage(
        message: unknown,
        options?: Transferable[] | StructuredSerializeOptions,
      ): void {
        window.__synthRequests?.push(message);
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
    const start: unknown = Reflect.get(AudioBufferSourceNode.prototype, 'start');
    if (typeof start !== 'function') return;
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.__played?.push(this.buffer?.duration ?? 0);
      Reflect.apply(start, this, args);
    };
  });
  await page.goto('/');
};

/** Talks to the fake worker. (These messages are recorded too; tests look for `synthesise` ones.) */
const tellWorker = (page: Page, type: 'release' | 'fail') =>
  page.evaluate((message) => {
    const [worker] = window.__workers ?? [];
    Worker.prototype.postMessage.call(worker, { type: message });
  }, type);

const key = (page: Page, glyph: string) =>
  page.getByRole('region', { name: 'Symbols' }).getByRole('button', {
    name: new RegExp(`^${glyph}\\s?,`),
  });
const playWord = (page: Page) =>
  page
    .getByRole('group', { name: 'Word actions' })
    .getByRole('button', { name: /Play word|Loading voice/ });
const played = (page: Page) => page.evaluate(() => window.__played ?? []);

test.describe('word audio (FR-31, FR-33)', () => {
  test.beforeEach(async ({ page }) => {
    await setUp(page);
  });

  test('FR-31: Play word loads the voice with progress, then speaks the word', async ({ page }) => {
    await expect(playWord(page)).toBeDisabled();
    for (const glyph of ['ˈ', 'f', 'l', 'ɒ', 'ɡ', 'ɪ', 'ʃ']) await key(page, glyph).click();
    await expect(playWord(page)).toBeEnabled();
    expect(await page.evaluate(() => window.__workers?.length)).toBe(0);

    await playWord(page).click();
    // The real serialiser's text reaches the worker: stress on the vowel, long-word ending.
    await expect
      .poll(() => page.evaluate(() => window.__synthRequests))
      .toEqual([expect.objectContaining({ type: 'synthesise', text: ' flˈɒɡɪʃ.' })]);
    await expect(playWord(page)).toHaveAccessibleName('Loading voice…');
    await expect(playWord(page)).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('progressbar', { name: 'Downloading the voice' })).toHaveAttribute(
      'value',
      '0.5',
    );
    await expectNoA11yViolations(page);

    await tellWorker(page, 'release');
    await expect(playWord(page)).toHaveAccessibleName('Play word');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect.poll(() => played(page)).toHaveLength(1);
    expect((await played(page))[0]).toBeCloseTo(0.4, 1);

    // Once loaded, the next play needs no loading state.
    await playWord(page).click();
    await expect.poll(() => played(page)).toHaveLength(2);
  });

  test('FR-33: a voice that fails to load says so, and the next try works', async ({ page }) => {
    for (const glyph of ['k', 'æ', 't']) await key(page, glyph).click();
    await playWord(page).click();
    await expect(playWord(page)).toHaveAccessibleName('Loading voice…');
    await tellWorker(page, 'fail');

    const message = 'Couldn’t load the voice. Check your connection and try again.';
    await expect(playWord(page)).toHaveAccessibleDescription(message);
    await expect(playWord(page)).toHaveAccessibleName('Play word');
    await expectNoA11yViolations(page);

    await playWord(page).click();
    await expect(playWord(page)).not.toHaveAccessibleDescription(message);
    await tellWorker(page, 'release');
    await expect.poll(() => played(page)).toHaveLength(1);
    // A short word ends in '!' (ADR-0009).
    const requests = await page.evaluate(() => window.__synthRequests ?? []);
    expect(requests).toContainEqual(expect.objectContaining({ type: 'synthesise', text: 'kæt!' }));
  });
});
