import { describe, expect, it, vi } from 'vitest';

import { createShellWorker } from './shell-worker';
import type { ShellCache, ShellCaches } from './shell-worker';

const scope = 'https://example.org/app/';

/** An in-memory CacheStorage: cache name → URL → response body. */
const fakeCaches = (initial: Record<string, Record<string, string>> = {}) => {
  const store = new Map(
    Object.entries(initial).map(([name, entries]) => [name, new Map(Object.entries(entries))]),
  );
  const fetched: Request[] = [];
  const fetch = vi.fn((request: Request) => {
    fetched.push(request);
    const ok = !request.url.endsWith('missing');
    return Promise.resolve(new Response(`net:${request.url}`, { status: ok ? 200 : 404 }));
  });
  const open = (name: string): ShellCache => {
    const entries = store.get(name) ?? new Map<string, string>();
    store.set(name, entries);
    return {
      match: (key) => {
        const body = entries.get(key);
        return Promise.resolve(body === undefined ? undefined : new Response(body));
      },
      put: async (key, response) => {
        entries.set(key, await response.text());
      },
      addAll: async (requests) => {
        const responses = await Promise.all(requests.map(fetch));
        if (responses.some((response) => !response.ok)) throw new TypeError('addAll failed');
        for (const [index, response] of responses.entries()) {
          entries.set(requests[index]?.url ?? '', await response.text());
        }
      },
    };
  };
  const caches: ShellCaches = {
    open: (name) => Promise.resolve(open(name)),
    keys: () => Promise.resolve([...store.keys()]),
    delete: (name) => Promise.resolve(store.delete(name)),
  };
  return { caches, store, fetch, fetched };
};

const worker = (fake: ReturnType<typeof fakeCaches>, paths = ['index.html', 'assets/a.js']) =>
  createShellWorker({ manifest: { version: 'v2', paths }, scope, ...fake });

/** A constructed Request can't have mode `navigate`, so this one reports it. */
class NavigationRequest extends Request {
  override get mode(): RequestMode {
    return 'navigate';
  }
}

const request = (path: string, mode: 'cors' | 'navigate' = 'cors') =>
  mode === 'navigate' ? new NavigationRequest(`${scope}${path}`) : new Request(`${scope}${path}`);

describe('createShellWorker (ADR-0013)', () => {
  it('FR-61: install fetches every shell file past the HTTP cache', async () => {
    const fake = fakeCaches();
    await worker(fake).install();
    expect(fake.fetched.map((r) => [r.url, r.cache])).toEqual([
      [`${scope}index.html`, 'reload'],
      [`${scope}assets/a.js`, 'reload'],
    ]);
    expect([...(fake.store.get('ipa-helper-shell-v2')?.keys() ?? [])]).toEqual([
      `${scope}index.html`,
      `${scope}assets/a.js`,
    ]);
  });

  it('fails the install when a shell file is missing, so a broken shell never activates', async () => {
    await expect(worker(fakeCaches(), ['index.html', 'missing']).install()).rejects.toThrow();
  });

  it('activate drops older shell caches and keeps every other cache', async () => {
    const fake = fakeCaches({
      'ipa-helper-shell-v1': {},
      'ipa-helper-shell-v2': {},
      'ipa-helper-audio-v1': {},
    });
    await worker(fake).activate();
    expect([...fake.store.keys()]).toEqual(['ipa-helper-shell-v2', 'ipa-helper-audio-v1']);
  });

  it('FR-61: answers navigations from the cache, without the network', async () => {
    const fake = fakeCaches({ 'ipa-helper-shell-v2': { [`${scope}index.html`]: 'page' } });
    const response = await worker(fake).respond(request('?w=1', 'navigate'));
    await expect(response?.text()).resolves.toBe('page');
    expect(fake.fetch).not.toHaveBeenCalled();
  });

  it('falls back to the network for a precached file the cache has lost, without storing it', async () => {
    const fake = fakeCaches();
    const response = await worker(fake).respond(request('assets/a.js'));
    await expect(response?.text()).resolves.toBe(`net:${scope}assets/a.js`);
    expect(fake.store.get('ipa-helper-shell-v2')?.size).toBe(0);
  });

  it('FR-61: stores lazy files on first use and serves them from the cache after', async () => {
    const fake = fakeCaches();
    const shell = worker(fake);
    await shell.respond(request('assets/synth.worker-x.js'));
    const again = await shell.respond(request('assets/synth.worker-x.js'));
    await expect(again?.text()).resolves.toBe(`net:${scope}assets/synth.worker-x.js`);
    expect(fake.fetch).toHaveBeenCalledOnce();
  });

  it('does not store a failed lazy fetch', async () => {
    const fake = fakeCaches();
    const response = await worker(fake).respond(request('assets/missing'));
    expect(response?.status).toBe(404);
    expect(fake.store.get('ipa-helper-shell-v2')?.size).toBe(0);
  });

  it('leaves other requests to the browser', () => {
    expect(worker(fakeCaches()).respond(request('assets/schwa-c.opus'))).toBeUndefined();
  });
});
