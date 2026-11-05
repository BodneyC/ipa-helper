import type { AppUpdates } from '../domain/ports';

/**
 * Asks a waiting worker to take over (FR-62). It must equal `SKIP_WAITING` in
 * src/sw/rules.ts. It is copied rather than imported, because a shared module
 * would be split into a chunk that the classic-script worker can't import
 * (ADR-0013). tests/e2e/pwa.spec.ts checks the two still agree.
 */
const SKIP_WAITING = { type: 'skip-waiting' } as const;

/** The parts of a `ServiceWorker` the adapter uses. */
interface WorkerLike {
  readonly state: string;
  postMessage(message: typeof SKIP_WAITING): void;
  addEventListener(type: 'statechange', listener: () => void): void;
}

/** The parts of a `ServiceWorkerRegistration` the adapter uses. */
interface RegistrationLike {
  readonly waiting: WorkerLike | null;
  readonly installing: WorkerLike | null;
  addEventListener(type: 'updatefound', listener: () => void): void;
}

/** The parts of a `ServiceWorkerContainer` the adapter uses. */
interface ContainerLike {
  readonly controller: object | null;
  register(url: string, options: { scope: string }): Promise<RegistrationLike>;
  addEventListener(type: 'controllerchange', listener: () => void): void;
}

interface ServiceWorkerUpdatesOptions {
  readonly container: ContainerLike;
  /** The worker script's URL, e.g. `/ipa-helper/sw.js`. */
  readonly scriptUrl: string;
  /** The app's base path, e.g. `/ipa-helper/`. */
  readonly scope: string;
  readonly reload?: () => void;
  /** Runs `start` once the page has loaded, so registering never competes with first paint. */
  readonly afterLoad?: (start: () => void) => void;
}

const afterWindowLoad = (start: () => void): void => {
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
};

/**
 * Registers the service worker (ADR-0013, FR-61) and reports new versions
 * (FR-62). A new worker waits until `apply()`, which tells it to take over
 * and then reloads the page. If registration fails, the app still works,
 * only not offline, so failures are silent.
 */
export const createServiceWorkerUpdates = ({
  container,
  scriptUrl,
  scope,
  reload = () => {
    location.reload();
  },
  afterLoad = afterWindowLoad,
}: ServiceWorkerUpdatesOptions): AppUpdates => {
  let waiting: WorkerLike | undefined;
  let applying = false;
  const listeners = new Set<() => void>();

  // A worker that installs while another controls the page is an update. On a
  // first visit nothing controls the page yet, so there is nothing to offer.
  const track = (worker: WorkerLike) => {
    const check = () => {
      if (worker.state !== 'installed' || container.controller === null || waiting === worker)
        return;
      waiting = worker;
      for (const listener of listeners) listener();
    };
    check();
    worker.addEventListener('statechange', check);
  };

  container.addEventListener('controllerchange', () => {
    if (applying) reload();
  });

  afterLoad(() => {
    container
      .register(scriptUrl, { scope })
      .then((registration) => {
        if (registration.waiting !== null) track(registration.waiting);
        registration.addEventListener('updatefound', () => {
          if (registration.installing !== null) track(registration.installing);
        });
      })
      .catch(() => undefined);
  });

  return {
    available: () => waiting !== undefined,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    apply: () => {
      if (waiting === undefined) return;
      applying = true;
      waiting.postMessage(SKIP_WAITING);
    },
  };
};
