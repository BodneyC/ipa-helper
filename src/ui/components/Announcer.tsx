import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Announce = (message: string) => void;

const AnnouncerContext = createContext<Announce>(() => undefined);

/**
 * The app's single polite live region (ARCHITECTURE §6): "Copied IPA", "Added ʃ"
 * and the like (FR-23). Repeating the same message still re-announces it.
 */
export function AnnouncerProvider({ children }: { readonly children: ReactNode }) {
  const [message, setMessage] = useState({ text: '', count: 0 });
  const announce = useCallback<Announce>((text) => {
    setMessage((previous) => ({ text, count: previous.count + 1 }));
  }, []);
  return (
    <AnnouncerContext value={announce}>
      {children}
      <div role="status" aria-live="polite" className="visuallyHidden">
        {/* A fresh key makes screen readers read a repeated message again. */}
        <span key={message.count}>{message.text}</span>
      </div>
    </AnnouncerContext>
  );
}

/** Announces a message to screen readers. */
export const useAnnounce = (): Announce => useContext(AnnouncerContext);
