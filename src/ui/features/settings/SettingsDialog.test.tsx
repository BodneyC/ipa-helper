import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { newCommandFor, SettingsDialog } from './SettingsDialog';
import { fakeAudio } from '../../../../tests/setup/fake-audio';
import { Providers } from '../../../app/providers';
import type { KeyValueStore } from '../../../domain/ports';
import { ok } from '../../../domain/result';
import { useSettings } from '../../../state/hooks';
import { DEFAULT_SETTINGS } from '../../../state/settings';
import type { Settings } from '../../../state/settings';
import { AnnouncerProvider } from '../../components/Announcer';

function Current() {
  const { settings } = useSettings();
  return <pre data-testid="settings">{JSON.stringify(settings)}</pre>;
}

const current = (): Settings => {
  const parsed: unknown = JSON.parse(screen.getByTestId('settings').textContent);
  return { ...DEFAULT_SETTINGS, ...(typeof parsed === 'object' ? parsed : {}) };
};

const setup = (settings: Partial<Settings> = {}, audio = fakeAudio('unsupported').audio) => {
  const onClose = vi.fn();
  const onHelp = vi.fn();
  const writeText = vi.fn(() => Promise.resolve(ok(undefined)));
  const set = vi.fn<KeyValueStore['set']>();
  render(
    <Providers
      initialSettings={{ ...DEFAULT_SETTINGS, ...settings }}
      services={{
        audio,
        clipboard: { writeText },
        store: { get: () => undefined, set, subscribe: () => () => undefined },
      }}
    >
      <AnnouncerProvider>
        <SettingsDialog open onClose={onClose} onHelp={onHelp} />
        <Current />
      </AnnouncerProvider>
    </Providers>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Settings' });
  return { dialog, onClose, onHelp, writeText, user: userEvent.setup() };
};

describe('<SettingsDialog> (FR-42)', () => {
  it('FR-40/FR-41: chooses the theme and contrast', async () => {
    const { dialog, user } = setup();
    const theme = within(dialog).getByRole('group', { name: 'Theme' });
    expect(within(theme).getByRole('radio', { name: 'Match system' })).toBeChecked();
    await user.click(within(theme).getByRole('radio', { name: 'Light' }));
    const contrast = within(dialog).getByRole('group', { name: 'Background contrast' });
    await user.click(within(contrast).getByRole('radio', { name: 'Hard' }));
    expect(current()).toMatchObject({ theme: 'light', contrast: 'hard' });
  });

  it('Q-3: switches the r between narrow and broad', async () => {
    const { dialog, user } = setup();
    await user.click(within(dialog).getByRole('radio', { name: /^r \(broad/ }));
    expect(current().rDisplay).toBe('broad');
  });

  it('M6.5: turns tie bars on affricates on and off', async () => {
    const { dialog, user } = setup();
    const affricates = within(dialog).getByRole('group', { name: 'Affricates' });
    const tie = within(affricates).getByRole('checkbox', { name: /^Write with a tie bar/ });
    expect(tie).not.toBeChecked();
    await user.click(tie);
    expect(current().tieBars).toBe(true);
    await user.click(tie);
    expect(current().tieBars).toBe(false);
  });

  it('FR-20, Q-2: sets both slash options', async () => {
    const { dialog, user } = setup();
    await user.click(within(dialog).getByRole('checkbox', { name: 'Copy IPA with slashes' }));
    await user.click(within(dialog).getByRole('checkbox', { name: /slashes inside the macro/ }));
    expect(current()).toMatchObject({ ipaSlashes: false, tipaSlashes: true });
  });

  it('FR-21: takes a letters-only macro name, and flags anything else without saving it', async () => {
    const { dialog, user } = setup();
    const input = within(dialog).getByRole('textbox', { name: 'LaTeX macro name' });
    expect(input).toHaveValue('ipa');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    await user.clear(input);
    await user.type(input, 'tipa2');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/Use letters only/);
    expect(current().macroName).toBe('tipa');
    await user.type(input, '{Backspace}');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(within(dialog).queryByText(/Use letters only/)).not.toBeInTheDocument();
  });

  it('FR-21: suggests a \\newcommand for the macro, and copies it', async () => {
    const { dialog, user, writeText } = setup({ macroName: 'pron' });
    const snippet = '\\newcommand{\\pron}[1]{\\textipa{/#1/}}';
    expect(within(dialog).getByText(snippet)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Copy definition' }));
    expect(writeText).toHaveBeenCalledWith(snippet);
  });

  it('Q-2: the suggested macro adds no slashes when they go inside the argument', () => {
    expect(newCommandFor('ipa', false)).toBe('\\newcommand{\\ipa}[1]{\\textipa{/#1/}}');
    expect(newCommandFor('ipa', true)).toBe('\\newcommand{\\ipa}[1]{\\textipa{#1}}');
  });

  it('resets every setting to its default', async () => {
    const { dialog, user } = setup({ theme: 'dark', macroName: 'pron', rDisplay: 'broad' });
    await user.click(within(dialog).getByRole('button', { name: 'Reset all settings' }));
    expect(current()).toEqual(DEFAULT_SETTINGS);
    expect(within(dialog).getByRole('textbox', { name: 'LaTeX macro name' })).toHaveValue('ipa');
  });

  it('opens the keyboard shortcuts in its place', async () => {
    const { dialog, user, onClose, onHelp } = setup();
    await user.click(within(dialog).getByRole('button', { name: 'Keyboard shortcuts' }));
    expect(onClose).toHaveBeenCalled();
    expect(onHelp).toHaveBeenCalled();
  });

  it('FR-2: turns hoverable tooltips on and off, off by default', async () => {
    const { dialog, user } = setup();
    const toggle = within(dialog).getByRole('checkbox', { name: /tooltip open/ });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(current().hoverableTooltips).toBe(true);
    await user.click(toggle);
    expect(current().hoverableTooltips).toBe(false);
  });

  it('FR-34: turns Sound on select on and off', async () => {
    const { dialog, user } = setup({}, fakeAudio('idle').audio);
    const toggle = within(dialog).getByRole('checkbox', { name: /Sound on select/ });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(current().soundOnSelect).toBe(true);
    await user.click(toggle);
    expect(current().soundOnSelect).toBe(false);
  });

  it('FR-34: disables Sound on select, and says why, when the browser has no audio', () => {
    const { dialog } = setup();
    const toggle = within(dialog).getByRole('checkbox', { name: /Sound on select/ });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAccessibleDescription('This browser can’t play audio.');
  });
});
