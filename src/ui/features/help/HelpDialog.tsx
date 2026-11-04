import styles from './HelpDialog.module.css';
import { SHORTCUTS } from './shortcuts';
import { Dialog } from '../../components/Dialog';

interface HelpDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/** FR-51: the `?` dialog listing the keyboard shortcuts. On a Mac, Cmd works for Ctrl. */
export function HelpDialog({ open, onClose }: HelpDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts">
      <table className={styles['table']}>
        <caption className="visuallyHidden">Keys and what they do</caption>
        <thead className="visuallyHidden">
          <tr>
            <th scope="col">Keys</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUTS.map(({ keys, join, does }) => (
            <tr key={does}>
              <th scope="row" className={styles['keys']}>
                {keys.map((k, i) => (
                  <span key={k}>
                    {i > 0 && (join === 'chord' ? ' + ' : ' ')}
                    <kbd>{k}</kbd>
                  </span>
                ))}
              </th>
              <td>{does}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles['note']}>On a Mac, use Cmd for Ctrl.</p>
    </Dialog>
  );
}
