import { describe, expect, it, vi } from 'vitest';

import { createServiceWorkerUpdates } from './service-worker';

/** A `ServiceWorker` whose state we move by hand. */
const fakeWorker = (initial: string) => {
  const target = new EventTarget();
  const worker = {
    state: initial,
    postMessage: vi.fn(),
    addEventListener: (type: 'statechange', listener: () => void) => {
      target.addEventListener(type, listener);
    },
  };
  const moveTo = (state: string) => {
    worker.state = state;
    target.dispatchEvent(new Event('statechange'));
  };
  return { worker, moveTo };
};

type FakeWorker = ReturnType<typeof fakeWorker>['worker'];

/** A registration and container. `controlled` is whether a worker already controls the page. */
const setup = ({
  controlled = true,
  waiting = null,
  fails = false,
  loaded = true,
}: {
  controlled?: boolean;
  waiting?: FakeWorker | null;
  fails?: boolean;
  loaded?: boolean;
} = {}) => {
  const registrationEvents = new EventTarget();
  const registration: {
    waiting: FakeWorker | null;
    installing: FakeWorker | null;
    addEventListener: (type: 'updatefound', listener: () => void) => void;
  } = {
    waiting,
    installing: null,
    addEventListener: (type: 'updatefound', listener: () => void) => {
      registrationEvents.addEventListener(type, listener);
    },
  };
  const containerEvents = new EventTarget();
  const register = vi.fn(() =>
    fails ? Promise.reject(new Error('blocked')) : Promise.resolve(registration),
  );
  const container = {
    controller: controlled ? {} : null,
    register,
    addEventListener: (type: 'controllerchange', listener: () => void) => {
      containerEvents.addEventListener(type, listener);
    },
  };
  const reload = vi.fn();
  let start: (() => void) | undefined;
  const updates = createServiceWorkerUpdates({
    container,
    scriptUrl: '/app/sw.js',
    scope: '/app/',
    reload,
    afterLoad: (begin) => {
      start = begin;
      if (loaded) begin();
    },
  });
  const listener = vi.fn();
  updates.subscribe(listener);
  /** Lets the registration promise settle. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  const findUpdate = (worker: FakeWorker | null) => {
    registration.installing = worker;
    registrationEvents.dispatchEvent(new Event('updatefound'));
  };
  const takeOver = () => containerEvents.dispatchEvent(new Event('controllerchange'));
  return {
    updates,
    register,
    reload,
    listener,
    settle,
    findUpdate,
    takeOver,
    load: () => start?.(),
  };
};

describe('createServiceWorkerUpdates (FR-61, FR-62)', () => {
  it('registers the worker for the app scope once the page has loaded', async () => {
    const { register, settle, load } = setup({ loaded: false });
    expect(register).not.toHaveBeenCalled();
    load();
    await settle();
    expect(register).toHaveBeenCalledWith('/app/sw.js', { scope: '/app/' });
  });

  it('FR-62: offers an update that finishes installing while the page is controlled', async () => {
    const { updates, listener, settle, findUpdate } = setup();
    await settle();
    const { worker, moveTo } = fakeWorker('installing');
    findUpdate(worker);
    expect(updates.available()).toBe(false);
    moveTo('installed');
    expect(updates.available()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
    moveTo('installed');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('FR-62: offers a worker that was already waiting when the page loaded', async () => {
    const { updates, settle } = setup({ waiting: fakeWorker('installed').worker });
    await settle();
    expect(updates.available()).toBe(true);
  });

  it('offers nothing on a first visit, when no worker controlled the page', async () => {
    const { updates, settle, findUpdate } = setup({ controlled: false });
    await settle();
    const { worker, moveTo } = fakeWorker('installing');
    findUpdate(worker);
    moveTo('installed');
    expect(updates.available()).toBe(false);
  });

  it('FR-62: apply tells the waiting worker to take over, then reloads when it has', async () => {
    const waiting = fakeWorker('installed').worker;
    const { updates, reload, settle, takeOver } = setup({ waiting });
    await settle();
    updates.apply();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'skip-waiting' });
    expect(reload).not.toHaveBeenCalled();
    takeOver();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload when the controller changes for another reason', async () => {
    const { reload, settle, takeOver } = setup();
    await settle();
    takeOver();
    expect(reload).not.toHaveBeenCalled();
  });

  it('apply does nothing with no update waiting', async () => {
    const { updates, reload, settle, takeOver } = setup();
    await settle();
    updates.apply();
    takeOver();
    expect(reload).not.toHaveBeenCalled();
  });

  it('ignores an update found with no installing worker, and stops notifying after unsubscribe', async () => {
    const { updates, settle, findUpdate } = setup();
    await settle();
    const listener = vi.fn();
    const unsubscribe = updates.subscribe(listener);
    unsubscribe();
    findUpdate(null);
    const { worker, moveTo } = fakeWorker('installing');
    findUpdate(worker);
    moveTo('installed');
    expect(listener).not.toHaveBeenCalled();
  });

  it('fails silently when registration is refused', async () => {
    const { updates, settle } = setup({ fails: true });
    await settle();
    expect(updates.available()).toBe(false);
  });

  it('waits for the window load event by default', () => {
    const register = vi.fn(() => new Promise<never>(() => undefined));
    const container = { controller: null, register, addEventListener: vi.fn() };
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    createServiceWorkerUpdates({ container, scriptUrl: '/sw.js', scope: '/' });
    expect(register).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('load'));
    expect(register).toHaveBeenCalledOnce();
  });

  it('registers at once when the page has already loaded', () => {
    const register = vi.fn(() => new Promise<never>(() => undefined));
    const container = { controller: null, register, addEventListener: vi.fn() };
    createServiceWorkerUpdates({ container, scriptUrl: '/sw.js', scope: '/' });
    expect(register).toHaveBeenCalledOnce();
  });
});
