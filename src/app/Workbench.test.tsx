import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Providers } from './providers';
import { SMALL_SCREEN, Workbench } from './Workbench';
import { useSettings } from '../state/hooks';
import { DEFAULT_SETTINGS } from '../state/settings';
import type { Settings } from '../state/settings';
import { AnnouncerProvider } from '../ui/components/Announcer';

/** Makes every media query match, or none. */
const screenIsSmall = (small: boolean) => {
  const matchMedia = vi.fn((query: string) => ({
    media: query,
    matches: small,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  vi.stubGlobal('matchMedia', matchMedia);
  return matchMedia;
};

function SettingsProbe() {
  const { settings } = useSettings();
  return <output aria-label="details open">{String(settings.wordDetailsOpen)}</output>;
}

const setup = (initialSettings: Settings = DEFAULT_SETTINGS) => {
  const onSaved = vi.fn();
  const onPaste = vi.fn();
  render(
    <Providers initialSettings={initialSettings}>
      <AnnouncerProvider>
        <Workbench onSaved={onSaved} onPaste={onPaste} />
        <SettingsProbe />
      </AnnouncerProvider>
    </Providers>,
  );
  return { onSaved, onPaste, user: userEvent.setup() };
};

describe('<Workbench> (SPEC §6)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is one card with every action and the outputs on a large screen', () => {
    screenIsSmall(false);
    setup();
    const card = screen.getByRole('region', { name: 'Word' });
    const actions = within(card).getByRole('group', { name: 'Word actions' });
    for (const name of ['Undo', 'Redo', 'Clear', 'Saved words…', 'Paste IPA…']) {
      expect(within(actions).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(within(card).getByRole('button', { name: 'Copy IPA' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More word tools' })).not.toBeInTheDocument();
    expect(within(card).getByText(/^Click symbols below/)).not.toHaveClass('visuallyHidden');
  });

  describe('on a small screen (#4)', () => {
    it('splits into the word strip and the details, using the small-screen query', () => {
      const matchMedia = screenIsSmall(true);
      setup();
      expect(matchMedia).toHaveBeenCalledWith(SMALL_SCREEN);

      const strip = screen.getByRole('region', { name: 'Word' });
      const primary = within(strip).getByRole('group', { name: 'Word actions' });
      // Play word joins them when word audio is available; these tests have none.
      expect(
        within(primary)
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['Undo', 'Redo']);
      expect(within(strip).getByText(/^Click symbols below/)).toHaveClass('visuallyHidden');

      const details = screen.getByRole('region', { name: 'Word details' });
      const secondary = within(details).getByRole('group', { name: 'More word actions' });
      expect(
        within(secondary)
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['Clear', 'Saved words…', 'Paste IPA…']);
      expect(within(details).getByRole('button', { name: 'Copy IPA' })).toBeInTheDocument();
    });

    it('More toggles the details and stores the choice as a setting', async () => {
      screenIsSmall(true);
      const { user } = setup();
      const more = screen.getByRole('button', { name: 'More word tools' });
      const details = screen.getByRole('region', { name: 'Word details' });
      expect(more).toHaveAttribute('aria-expanded', 'true');
      expect(more).toHaveAttribute('aria-controls', details.parentElement?.id);

      await user.click(more);
      expect(more).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('region', { name: 'Word details' })).not.toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'details open' })).toHaveTextContent('false');

      await user.click(more);
      expect(more).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('status', { name: 'details open' })).toHaveTextContent('true');
    });

    it('starts with the details hidden when that was the stored choice', () => {
      screenIsSmall(true);
      setup({ ...DEFAULT_SETTINGS, wordDetailsOpen: false });
      expect(screen.getByRole('button', { name: 'More word tools' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(screen.queryByRole('region', { name: 'Word details' })).not.toBeInTheDocument();
    });

    it('opens the saved words and paste dialogs from the details', async () => {
      screenIsSmall(true);
      const { user, onSaved, onPaste } = setup();
      await user.click(screen.getByRole('button', { name: 'Saved words…' }));
      await user.click(screen.getByRole('button', { name: 'Paste IPA…' }));
      expect(onSaved).toHaveBeenCalledOnce();
      expect(onPaste).toHaveBeenCalledOnce();
    });
  });
});
