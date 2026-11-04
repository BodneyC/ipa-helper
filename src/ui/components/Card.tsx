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
  /** Extra controls shown on the heading row, e.g. a collapse toggle. */
  readonly actions?: ReactNode;
  readonly className?: string | undefined;
  readonly children: ReactNode;
}

/** A surface card: a labelled `<section>` with a heading. */
export function Card({
  title,
  headingLevel,
  hideTitle = false,
  accent,
  actions,
  className,
  children,
}: CardProps) {
  const headingId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section
      aria-labelledby={headingId}
      className={[styles['card'], className].filter(Boolean).join(' ')}
      data-accent={accent}
    >
      <div className={hideTitle && actions === undefined ? 'visuallyHidden' : styles['header']}>
        <Heading id={headingId} className={hideTitle ? 'visuallyHidden' : styles['title']}>
          {title}
        </Heading>
        {actions}
      </div>
      {children}
    </section>
  );
}
