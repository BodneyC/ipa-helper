import { useMemo, useRef, useState } from 'react';

import styles from './App.module.css';
import { SettingsSync } from './SettingsSync';
import { TopBar } from './TopBar';
import { useEditor, useSettings } from '../state/hooks';
import { AnnouncerProvider } from '../ui/components/Announcer';
import { Card } from '../ui/components/Card';
import { TOOLTIP_CEILING } from '../ui/components/Tooltip';
import { GlobalShortcuts } from '../ui/features/help/GlobalShortcuts';
import { HelpDialog } from '../ui/features/help/HelpDialog';
import { OutputPanel } from '../ui/features/output/OutputPanel';
import { PaletteWithAudio } from '../ui/features/palette/PaletteWithAudio';
import { SavedWordsDialog } from '../ui/features/saved/SavedWordsDialog';
import { SettingsDialog } from '../ui/features/settings/SettingsDialog';
import { UpdateNotice } from '../ui/features/update/UpdateNotice';
import { PasteDialog } from '../ui/features/word/PasteDialog';
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
  const [savedOpen, setSavedOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filterRef = useRef<HTMLInputElement>(null);
  const { rDisplay, tieBars } = settings;
  // Stable between word edits, so the palette's play handlers don't churn.
  const glyphs = useMemo(() => ({ rDisplay, tieBars }), [rDisplay, tieBars]);
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
        <div className={styles['workbench']} {...{ [TOOLTIP_CEILING]: '' }}>
          <Card title="Word" headingLevel={2} hideTitle>
            <div className={styles['workbenchBody']}>
              <UrlSync />
              <WordDisplay />
              <WordActions
                onSaved={() => {
                  setSavedOpen(true);
                }}
                onPaste={() => {
                  setPasteOpen(true);
                }}
              />
              <OutputPanel />
            </div>
          </Card>
        </div>
        <PaletteWithAudio
          inventory={settings.inventory}
          query={query}
          collapsedGroups={settings.collapsedGroups}
          onToggleGroup={(group) => {
            settingsDispatch({ type: 'toggleGroup', group });
          }}
          glyphs={glyphs}
          soundOnSelect={settings.soundOnSelect}
          onActivate={(symbol) => {
            dispatch({ type: 'insert', symbolId: symbol.id });
          }}
        />
      </main>
      <SavedWordsDialog
        open={savedOpen}
        onClose={() => {
          setSavedOpen(false);
        }}
      />
      <PasteDialog
        open={pasteOpen}
        onClose={() => {
          setPasteOpen(false);
        }}
      />
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
      <UpdateNotice />
    </AnnouncerProvider>
  );
}
