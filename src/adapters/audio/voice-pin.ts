// No imports, so the Vite config can load it (scripts/audio/dev-plugin.ts)
// without pulling in the domain.
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
