import { useId } from 'react';

import styles from './OutputPanel.module.css';
import { useOutputs } from './outputs';
import { symbolById } from '../../../domain/inventory/index';
import type { SymbolId } from '../../../domain/inventory/symbol-id';
import { FORMAT_IDS, FORMAT_NAMES } from '../../../domain/serialise/formats';
import { labelsOf } from '../../../domain/serialise/labels';
import { useSettings } from '../../../state/hooks';
import { glyphsOf } from '../../../state/settings';
import { CopyButton } from '../../components/CopyButton';

const isFormatId = (value: string) => FORMAT_IDS.find((id) => id === value);

/**
 * FR-20–FR-23: the word as IPA and as TIPA, each with copy actions. The TIPA row
 * also copies the full macro call, e.g. `\ipa{"TO:nIk}`.
 *
 * FR-25: a third row shows the word in another format, chosen from a picker,
 * and names any symbols that format can't write (they are left out of it).
 */
export function OutputPanel() {
  const { settings, dispatch } = useSettings();
  const toggleId = useId();
  const formatId = useId();
  const { empty, ipaShown, ipaCopied, tipa, macro, other } = useOutputs();
  const name = FORMAT_NAMES[settings.format];
  const missing = other.unsupported.flatMap((id: SymbolId) => symbolById(id) ?? []);

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
      <div className={styles['row']}>
        <dt className={styles['chip']}>More</dt>
        <dd className={styles['value']}>
          <output className={styles['tipa']}>{empty ? '—' : other.text}</output>
          <div className={styles['controls']}>
            <label className={styles['toggle']} htmlFor={formatId}>
              Format
              <select
                id={formatId}
                className={styles['select']}
                value={settings.format}
                onChange={(event) => {
                  const format = isFormatId(event.target.value);
                  if (format !== undefined) dispatch({ type: 'update', patch: { format } });
                }}
              >
                {FORMAT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {FORMAT_NAMES[id]}
                  </option>
                ))}
              </select>
            </label>
            <CopyButton
              text={other.text}
              label="Copy"
              name={`Copy ${name}`}
              done={`Copied ${name}`}
              disabled={empty}
            />
          </div>
          {!empty && missing.length > 0 && (
            <p className={styles['note']}>
              {name} can’t write{' '}
              {missing.map((symbol, i) => (
                <span key={symbol.id}>
                  {i > 0 && ', '}
                  <span className={styles['glyph']} aria-hidden="true">
                    {labelsOf(symbol, glyphsOf(settings)).glyph}
                  </span>{' '}
                  {symbol.name}
                </span>
              ))}
              , so {missing.length === 1 ? 'it is' : 'they are'} left out.
            </p>
          )}
        </dd>
      </div>
    </dl>
  );
}
