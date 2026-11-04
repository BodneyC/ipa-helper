import { useEffect, useRef, useState } from 'react';

import { useCopy } from './copy';
import styles from './CopyButton.module.css';

interface CopyButtonProps {
  /** What to copy. */
  readonly text: string;
  /** Visible label, e.g. "Copy". */
  readonly label: string;
  /** Accessible name, e.g. "Copy IPA". It starts with the visible label (WCAG 2.5.3). */
  readonly name: string;
  /** Announced on success, e.g. "Copied IPA". */
  readonly done: string;
  readonly disabled?: boolean;
  readonly variant?: 'primary' | 'secondary';
}

const FEEDBACK_MS = 1500;

/** FR-20, FR-21, FR-23: copies text, then shows and announces brief feedback. */
export function CopyButton({
  text,
  label,
  name,
  done,
  disabled = false,
  variant = 'primary',
}: CopyButtonProps) {
  const copyText = useCopy();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    if (!(await copyText(text, done))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setCopied(false);
    }, FEEDBACK_MS);
  };

  return (
    <button
      type="button"
      className={styles[variant]}
      aria-label={copied ? `Copied, ${name}` : name}
      disabled={disabled}
      onClick={() => {
        void copy();
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
