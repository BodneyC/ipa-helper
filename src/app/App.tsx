import styles from './App.module.css';
import { TopBar } from './TopBar';
import { Card } from '../ui/components/Card';

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
        <section aria-labelledby="palette-heading" className={styles['palette']}>
          <h2 id="palette-heading" className="visuallyHidden">
            Symbols
          </h2>
        </section>
      </main>
    </>
  );
}
