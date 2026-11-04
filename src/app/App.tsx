import { useRef, useState } from 'react';

import styles from './App.module.css';
import { SettingsSync } from './SettingsSync';
import { TopBar } from './TopBar';
import { useEditor, useSettings } from '../state/hooks';
import { AnnouncerProvider } from '../ui/components/Announcer';
import { Card } from '../ui/components/Card';
import { GlobalShortcuts } from '../ui/features/help/GlobalShortcuts';
import { HelpDialog } from '../ui/features/help/HelpDialog';
import { OutputPanel } from '../ui/features/output/OutputPanel';
import { Palette } from '../ui/features/palette/Palette';
import { SettingsDialog } from '../ui/features/settings/SettingsDialog';
import { UrlSync } from '../ui/features/word/UrlSync';
import { WordActions } from '../ui/features/word/WordActions';
import { WordDisplay } from '../ui/features/word/WordDisplay';

/**
 * Page layout (SPEC §6, ARCHITECTURE §6): the top bar, the workbench card with the
 * word and its outputs, then the palette of group cards.
 */
export function App() {
  const { dispatch } = useEditor();
  const { settings, dispatch: settingsDispatch } = useSettings();
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filterRef = useRef<HTMLInputElement>(null);
  const openHelp = () => {
    setHelpOpen(true);
  };
  return (
    <AnnouncerProvider>
      <SettingsSync />
      <GlobalShortcuts
        onHelp={openHelp}
        onFilter={() => {
          filterRef.current?.focus();
        }}
      />
      <TopBar
        query={query}
        onQueryChange={setQuery}
        filterRef={filterRef}
        onHelp={openHelp}
        onSettings={() => {
          setSettingsOpen(true);
        }}
      />
      <main className={styles['main']}>
        <div className={styles['workbench']}>
          <Card title="Word" headingLevel={2} hideTitle>
            <div className={styles['workbenchBody']}>
              <UrlSync />
              <WordDisplay />
              <WordActions />
              <OutputPanel />
            </div>
          </Card>
        </div>
        <Palette
          inventory={settings.inventory}
          query={query}
          collapsedGroups={settings.collapsedGroups}
          onToggleGroup={(group) => {
            settingsDispatch({ type: 'toggleGroup', group });
          }}
          rDisplay={settings.rDisplay}
          onActivate={(symbol) => {
            dispatch({ type: 'insert', symbolId: symbol.id });
          }}
        />
      </main>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
        }}
        onHelp={openHelp}
      />
      <HelpDialog
        open={helpOpen}
        onClose={() => {
          setHelpOpen(false);
        }}
      />
    </AnnouncerProvider>
  );
}
