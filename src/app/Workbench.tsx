import { useId } from 'react';

import styles from './Workbench.module.css';
import { useSettings } from '../state/hooks';
import { Card } from '../ui/components/Card';
import { useMediaQuery } from '../ui/components/media-query';
import { TOOLTIP_CEILING } from '../ui/components/Tooltip';
import { OutputPanel } from '../ui/features/output/OutputPanel';
import { UrlSync } from '../ui/features/word/UrlSync';
import { WordActions } from '../ui/features/word/WordActions';
import { WordDisplay } from '../ui/features/word/WordDisplay';

/**
 * Small screens (SPEC §6, #4): narrower than 768 px, or shorter than 500 px (a
 * phone in landscape). Keep in step with the media queries in Workbench.module.css.
 */
export const SMALL_SCREEN = '(width < 768px), (height < 500px)';

interface WorkbenchProps {
  /** Opens the saved words dialog (FR-16). */
  readonly onSaved: () => void;
  /** Opens the paste IPA dialog (FR-17). */
  readonly onPaste: () => void;
}

/**
 * The word and its outputs (SPEC §6). On a large screen it is one card. On a
 * small one it splits in two: a compact strip (the word, Play word, Undo, Redo
 * and a More button) that stays sticky under the top bar, and the details (the
 * other actions and the outputs) that scroll away with the page. More shows or
 * hides the details, and the choice is a setting, so it is remembered.
 */
export function Workbench({ onSaved, onPaste }: WorkbenchProps) {
  const small = useMediaQuery(SMALL_SCREEN);
  const { settings, dispatch } = useSettings();
  const detailsId = useId();
  const ceiling = { [TOOLTIP_CEILING]: '' };

  if (!small) {
    return (
      <div className={styles['workbench']} {...ceiling}>
        <Card title="Word" headingLevel={2} hideTitle>
          <div className={styles['body']}>
            <UrlSync />
            <WordDisplay />
            <WordActions onSaved={onSaved} onPaste={onPaste} />
            <OutputPanel />
          </div>
        </Card>
      </div>
    );
  }

  const open = settings.wordDetailsOpen;
  return (
    <>
      <div className={styles['strip']} {...ceiling}>
        <Card title="Word" headingLevel={2} hideTitle className={styles['stripCard']}>
          <div className={styles['stripBody']}>
            <UrlSync />
            <div className={styles['word']}>
              <WordDisplay hideHint />
            </div>
            <button
              type="button"
              className={styles['more']}
              aria-expanded={open}
              aria-controls={detailsId}
              aria-label="More word tools"
              onClick={() => {
                dispatch({ type: 'update', patch: { wordDetailsOpen: !open } });
              }}
            >
              <svg className={styles['chevron']} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
            <div className={styles['actions']}>
              <WordActions part="primary" onSaved={onSaved} onPaste={onPaste} />
            </div>
          </div>
        </Card>
      </div>
      <div id={detailsId} hidden={!open}>
        <Card title="Word details" headingLevel={2} hideTitle>
          <div className={styles['body']}>
            <WordActions part="secondary" onSaved={onSaved} onPaste={onPaste} />
            <OutputPanel />
          </div>
        </Card>
      </div>
    </>
  );
}
