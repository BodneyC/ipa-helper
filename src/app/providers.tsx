import type { ReactNode } from 'react';

interface ProvidersProps {
  readonly children: ReactNode;
}

/**
 * Context providers for services and settings. The composition root
 * (`src/main.tsx`) wires adapters in here; for now it is a pass-through.
 */
export function Providers({ children }: ProvidersProps) {
  return children;
}
