import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import styles from './Tooltip.module.css';

interface TooltipProps {
  readonly id: string;
  /** The element the tooltip points at. */
  readonly anchor: HTMLElement | null;
  readonly open: boolean;
  /** Pointer handlers, so that moving onto the tooltip keeps it open (WCAG 1.4.13). */
  readonly onPointerEnter?: () => void;
  readonly onPointerLeave?: () => void;
  readonly children: ReactNode;
}

const GAP = 8;

/**
 * A tooltip in a portal with fixed positioning, so that scroll containers such as
 * the consonant chart can't clip it. It sits above its anchor, or below when there is
 * no room above, and stays inside the viewport. It is always in the DOM (hidden
 * when closed), so `aria-describedby` can point into it.
 */
export function Tooltip({
  id,
  anchor,
  open,
  onPointerEnter,
  onPointerLeave,
  children,
}: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || anchor === null || el === null) return;
    const a = anchor.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    const above = a.top - t.height - GAP;
    const below = above < GAP;
    const left = Math.min(
      Math.max(a.left + a.width / 2 - t.width / 2, GAP),
      window.innerWidth - t.width - GAP,
    );
    el.style.top = `${String(below ? a.bottom + GAP : above)}px`;
    el.style.left = `${String(Math.max(left, GAP))}px`;
    el.dataset['placement'] = below ? 'below' : 'above';
  }, [open, anchor]);

  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      hidden={!open}
      className={styles['tooltip']}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </div>,
    // Inside <main> when there is one, so the tooltip stays within a landmark (axe "region").
    anchor?.closest('main') ?? document.body,
  );
}
