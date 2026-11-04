import styles from './App.module.css';
import { TopBar } from './TopBar';
import { DEFAULT_SETTINGS } from '../state/settings';
import { Card } from '../ui/components/Card';
import { Palette } from '../ui/features/palette/Palette';

/**
 * Page layout (SPEC §6, ARCHITECTURE §6): the top bar, the workbench card with the
 * word and its outputs, then the palette of group cards.
 */
export function App() {
  return (
    <>
      <TopBar />
      <main className={styles['main']}>
        <div className={styles['workbench']}>
          <Card title="Word" headingLevel={2} hideTitle>
            <p className={styles['placeholder']}>/…/</p>
          </Card>
        </div>
        <Palette
          inventory={DEFAULT_SETTINGS.inventory}
          rDisplay={DEFAULT_SETTINGS.rDisplay}
          onActivate={() => undefined}
        />
      </main>
    </>
  );
}
