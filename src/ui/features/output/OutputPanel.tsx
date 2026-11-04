import { useId } from 'react';

import styles from './OutputPanel.module.css';
import { useOutputs } from './outputs';
import { useSettings } from '../../../state/hooks';
import { CopyButton } from '../../components/CopyButton';

/**
 * FR-20–FR-23: the word as IPA and as TIPA, each with copy actions. The TIPA row
 * also copies the full macro call, e.g. `\ipa{"TO:nIk}`.
 */
export function OutputPanel() {
  const { settings, dispatch } = useSettings();
  const toggleId = useId();
  const { empty, ipaShown, ipaCopied, tipa, macro } = useOutputs();

  return (
    <dl className={styles['panel']}>
      <div className={styles['row']}>
        <dt className={styles['chip']}>IPA</dt>
        <dd className={styles['value']}>
          <output className={styles['ipa']}>{empty ? '—' : ipaShown}</output>
          <div className={styles['controls']}>
            <CopyButton
              text={ipaCopied}
              label="Copy"
              name="Copy IPA"
              done="Copied IPA"
              disabled={empty}
            />
            <label className={styles['toggle']} htmlFor={toggleId}>
              <input
                id={toggleId}
                type="checkbox"
                checked={settings.ipaSlashes}
                onChange={(event) => {
                  dispatch({ type: 'update', patch: { ipaSlashes: event.target.checked } });
                }}
              />
              Copy with slashes
            </label>
          </div>
        </dd>
      </div>
      <div className={styles['row']}>
        <dt className={styles['chip']}>TIPA</dt>
        <dd className={styles['value']}>
          <output className={styles['tipa']}>{empty ? '—' : tipa}</output>
          <div className={styles['controls']}>
            <CopyButton
              text={tipa}
              label="Copy"
              name="Copy TIPA"
              done="Copied TIPA"
              disabled={empty}
            />
            <CopyButton
              text={macro}
              label={`Copy \\${settings.macroName}{…}`}
              name={`Copy \\${settings.macroName}{…} macro call`}
              done={`Copied \\${settings.macroName} macro call`}
              disabled={empty}
              variant="secondary"
            />
          </div>
        </dd>
      </div>
    </dl>
  );
}
