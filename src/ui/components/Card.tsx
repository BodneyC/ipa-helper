import { useId } from 'react';
import type { ReactNode } from 'react';

import type { Accent } from './accent';
import styles from './Card.module.css';

interface CardProps {
  /** The card's heading text. It also names the section landmark. */
  readonly title: string;
  readonly headingLevel: 2 | 3;
  /** Hide the heading visually, keeping it for screen readers. */
  readonly hideTitle?: boolean;
  /** Draws the group's accent bar along the top edge (SPEC §6). */
  readonly accent?: Accent;
  /** Extra controls shown on the heading row. */
  readonly actions?: ReactNode;
  /**
   * Makes the card collapsible (FR-5): the heading becomes a disclosure button
   * (`aria-expanded`), and the body is hidden while collapsed.
   */
  readonly collapse?: { readonly collapsed: boolean; readonly onToggle: () => void } | undefined;
  readonly className?: string | undefined;
  readonly children: ReactNode;
}

/** A surface card: a labelled `<section>` with a heading, optionally collapsible. */
export function Card({
  title,
  headingLevel,
  hideTitle = false,
  accent,
  actions,
  collapse,
  className,
  children,
}: CardProps) {
  const headingId = useId();
  const bodyId = useId();
  const collapsed = collapse?.collapsed ?? false;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section
      aria-labelledby={headingId}
      className={[styles['card'], className].filter(Boolean).join(' ')}
      data-accent={accent}
    >
      <div className={hideTitle && actions === undefined ? 'visuallyHidden' : styles['header']}>
        <Heading id={headingId} className={hideTitle ? 'visuallyHidden' : styles['title']}>
          {collapse === undefined ? (
            title
          ) : (
            <button
              type="button"
              className={styles['toggle']}
              aria-expanded={!collapsed}
              aria-controls={bodyId}
              onClick={collapse.onToggle}
            >
              <svg className={styles['chevron']} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 6l4 4 4-4" />
              </svg>
              {title}
            </button>
          )}
        </Heading>
        {actions}
      </div>
      <div id={bodyId} hidden={collapsed}>
        {children}
      </div>
    </section>
  );
}
