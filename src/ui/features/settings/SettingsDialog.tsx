import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import styles from './SettingsDialog.module.css';
import { useSettings } from '../../../state/hooks';
import { CONTRASTS, isMacroName, THEMES } from '../../../state/settings';
import type { Settings } from '../../../state/settings';
import { CopyButton } from '../../components/CopyButton';
import { Dialog } from '../../components/Dialog';
import { useAudioStatus } from '../audio/use-audio';

interface SettingsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Opens the keyboard shortcuts dialog (for screens without the `?` button). */
  readonly onHelp: () => void;
}

const THEME_LABELS: Readonly<Record<Settings['theme'], string>> = {
  system: 'Match system',
  dark: 'Dark',
  light: 'Light',
};
const CONTRAST_LABELS: Readonly<Record<Settings['contrast'], string>> = {
  soft: 'Soft',
  medium: 'Medium',
  hard: 'Hard',
};
const R_LABELS: Readonly<Record<Settings['rDisplay'], ReactNode>> = {
  narrow: (
    <>
      <span className={styles['ipa']}>ɹ</span> (narrow)
    </>
  ),
  broad: (
    <>
      <span className={styles['ipa']}>r</span> (broad, as dictionaries write it)
    </>
  ),
};

/**
 * The suggested definition for the user's macro (FR-21). With slashes inside
 * the argument (Q-2), the macro mustn't add its own.
 */
export const newCommandFor = (macroName: string, slashesInside: boolean): string =>
  `\\newcommand{\\${macroName}}[1]{\\textipa{${slashesInside ? '#1' : '/#1/'}}}`;

interface ChoiceProps<T extends string> {
  readonly legend: string;
  readonly name: string;
  readonly values: readonly T[];
  readonly labels: Readonly<Record<T, ReactNode>>;
  readonly value: T;
  readonly onChange: (value: T) => void;
}

/** A radio group. Native radios give arrow-key movement for free (FR-50). */
function Choice<T extends string>({
  legend,
  name,
  values,
  labels,
  value,
  onChange,
}: ChoiceProps<T>) {
  return (
    <fieldset className={styles['fieldset']}>
      <legend className={styles['legend']}>{legend}</legend>
      <div className={styles['options']}>
        {values.map((v) => (
          <label key={v} className={styles['option']}>
            <input
              type="radio"
              name={name}
              checked={v === value}
              onChange={() => {
                onChange(v);
              }}
            />
            <span className={styles['optionText']}>{labels[v]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** FR-42: every setting in one dialog, stored locally as soon as it changes. */
export function SettingsDialog({ open, onClose, onHelp }: SettingsDialogProps) {
  const { settings, dispatch } = useSettings();
  const update = (patch: Partial<Settings>) => {
    dispatch({ type: 'update', patch });
  };
  const ids = {
    macro: useId(),
    macroHint: useId(),
    macroError: useId(),
    name: useId(),
    soundHint: useId(),
  };
  // FR-34: symbol audio needs Web Audio; without it the toggle can do nothing.
  const canPlay = useAudioStatus().symbols !== 'unsupported';
  const [macroDraft, setMacroDraft] = useState(settings.macroName);
  const macroValid = isMacroName(macroDraft);
  const snippet = newCommandFor(settings.macroName, settings.tipaSlashes);

  return (
    <Dialog open={open} onClose={onClose} title="Settings">
      <div className={styles['sections']}>
        <Choice
          legend="Theme"
          name={`${ids.name}-theme`}
          values={THEMES}
          labels={THEME_LABELS}
          value={settings.theme}
          onChange={(theme) => {
            update({ theme });
          }}
        />
        <Choice
          legend="Background contrast"
          name={`${ids.name}-contrast`}
          values={CONTRASTS}
          labels={CONTRAST_LABELS}
          value={settings.contrast}
          onChange={(contrast) => {
            update({ contrast });
          }}
        />
        <Choice
          legend="British r"
          name={`${ids.name}-r`}
          values={['narrow', 'broad'] as const}
          labels={R_LABELS}
          value={settings.rDisplay}
          onChange={(rDisplay) => {
            update({ rDisplay });
          }}
        />

        <fieldset className={styles['fieldset']}>
          <legend className={styles['legend']}>Affricates</legend>
          <label className={styles['option']}>
            <input
              type="checkbox"
              checked={settings.tieBars}
              onChange={(event) => {
                update({ tieBars: event.target.checked });
              }}
            />
            <span className={styles['optionText']}>
              Write with a tie bar: <span className={styles['ipa']}>t͡ʃ</span>,{' '}
              <code>\t{'{tS}'}</code>
            </span>
          </label>
        </fieldset>

        <fieldset className={styles['fieldset']}>
          <legend className={styles['legend']}>Tooltips</legend>
          <label className={styles['option']}>
            <input
              type="checkbox"
              checked={settings.hoverableTooltips}
              onChange={(event) => {
                update({ hoverableTooltips: event.target.checked });
              }}
            />
            <span className={styles['optionText']}>
              Keep a key’s tooltip open while the pointer is over it
            </span>
          </label>
        </fieldset>

        <fieldset className={styles['fieldset']}>
          <legend className={styles['legend']}>Sound</legend>
          <label className={styles['option']}>
            <input
              type="checkbox"
              checked={settings.soundOnSelect}
              disabled={!canPlay}
              aria-describedby={canPlay ? undefined : ids.soundHint}
              onChange={(event) => {
                update({ soundOnSelect: event.target.checked });
              }}
            />
            <span className={styles['optionText']}>
              Sound on select: play each symbol as it is added
            </span>
          </label>
          {!canPlay && (
            <p id={ids.soundHint} className={styles['hint']}>
              This browser can’t play audio.
            </p>
          )}
        </fieldset>

        <fieldset className={styles['fieldset']}>
          <legend className={styles['legend']}>Copying</legend>
          <label className={styles['option']}>
            <input
              type="checkbox"
              checked={settings.ipaSlashes}
              onChange={(event) => {
                update({ ipaSlashes: event.target.checked });
              }}
            />
            <span className={styles['optionText']}>Copy IPA with slashes</span>
          </label>
          <label className={styles['option']}>
            <input
              type="checkbox"
              checked={settings.tipaSlashes}
              onChange={(event) => {
                update({ tipaSlashes: event.target.checked });
              }}
            />
            <span className={styles['optionText']}>
              Put slashes inside the macro argument, for a macro that doesn’t add them
            </span>
          </label>
        </fieldset>

        <div className={styles['field']}>
          <label htmlFor={ids.macro} className={styles['legend']}>
            LaTeX macro name
          </label>
          <div className={styles['macroRow']}>
            <span className={styles['backslash']} aria-hidden="true">
              \
            </span>
            <input
              id={ids.macro}
              className={styles['text']}
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={macroDraft}
              aria-invalid={!macroValid}
              aria-describedby={macroValid ? ids.macroHint : `${ids.macroHint} ${ids.macroError}`}
              onChange={(event) => {
                const name = event.target.value;
                setMacroDraft(name);
                if (isMacroName(name)) update({ macroName: name });
              }}
            />
          </div>
          <p id={ids.macroHint} className={styles['hint']}>
            Letters only, without the backslash. The TIPA row copies{' '}
            <code>
              \{settings.macroName}
              {'{…}'}
            </code>
            .
          </p>
          {!macroValid && (
            <p id={ids.macroError} className={styles['error']}>
              Use letters only (a–z, A–Z). Still using \{settings.macroName}.
            </p>
          )}
        </div>

        <div className={styles['field']}>
          <p className={styles['legend']}>Suggested definition</p>
          <p className={styles['hint']}>
            The <code>tipa</code> package has no <code>\{settings.macroName}</code> macro. Add this
            to your preamble after <code>\usepackage{'{tipa}'}</code>:
          </p>
          <pre className={styles['snippet']}>
            <code>{snippet}</code>
          </pre>
          <CopyButton
            text={snippet}
            label="Copy definition"
            name="Copy definition"
            done="Copied the macro definition"
          />
        </div>

        <div className={styles['footer']}>
          <button
            type="button"
            className={styles['button']}
            onClick={() => {
              onClose();
              onHelp();
            }}
          >
            Keyboard shortcuts
          </button>
          <button
            type="button"
            className={styles['danger']}
            onClick={() => {
              dispatch({ type: 'reset' });
              setMacroDraft('ipa');
            }}
          >
            Reset all settings
          </button>
        </div>
      </div>
    </Dialog>
  );
}
