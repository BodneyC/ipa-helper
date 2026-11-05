/** The slice of the Cache API the audio adapters use. */
export interface AudioCache {
  match(url: string): Promise<Response | undefined>;
  put(url: string, response: Response): Promise<void>;
}

/**
 * The Cache API store for symbol clips and the voice model (FR-33). Their URLs
 * are fingerprinted, so entries never go stale and need no expiry.
 */
const CACHE_NAME = 'ipa-helper-audio-v1';

/**
 * Opens the audio cache, in a page or a worker. `undefined` when there is none:
 * `caches` is missing on insecure origins, and opening can fail in private modes.
 */
export const openAudioCache = async (): Promise<AudioCache | undefined> => {
  if (typeof caches === 'undefined') return undefined;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return undefined;
  }
};
