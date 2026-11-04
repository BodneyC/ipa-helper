import styles from './App.module.css';
import { TopBar } from './TopBar';
import { useEditor, useSettings } from '../state/hooks';
import { Card } from '../ui/components/Card';
import { Palette } from '../ui/features/palette/Palette';
import { WordActions } from '../ui/features/word/WordActions';
import { WordDisplay } from '../ui/features/word/WordDisplay';

/**
 * Page layout (SPEC §6, ARCHITECTURE §6): the top bar, the workbench card with the
 * word and its outputs, then the palette of group cards.
 */
export function App() {
  const { dispatch } = useEditor();
  const { settings } = useSettings();
  return (
    <>
      <TopBar />
      <main className={styles['main']}>
        <div className={styles['workbench']}>
          <Card title="Word" headingLevel={2} hideTitle>
            <div className={styles['workbenchBody']}>
              <WordDisplay />
              <WordActions />
            </div>
          </Card>
        </div>
        <Palette
          inventory={settings.inventory}
          rDisplay={settings.rDisplay}
          onActivate={(symbol) => {
            dispatch({ type: 'insert', symbolId: symbol.id });
          }}
        />
      </main>
    </>
  );
}
