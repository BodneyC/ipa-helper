import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

import styles from './Dialog.module.css';

interface DialogProps {
  readonly open: boolean;
  /** Called when the dialog closes itself: Escape (FR-51) or the Close button. */
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
}

/**
 * A modal dialog on the native `<dialog>`: the browser traps focus, makes the
 * page inert and closes it on Escape. Focus goes back to whatever had it before.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null || !open) return;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open]);

  return (
    <dialog ref={ref} className={styles['dialog']} aria-labelledby={titleId} onClose={onClose}>
      <div className={styles['header']}>
        <h2 id={titleId} className={styles['title']}>
          {title}
        </h2>
        <button type="button" className={styles['close']} onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
