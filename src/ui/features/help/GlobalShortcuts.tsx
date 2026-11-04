import { useEffect, useRef } from 'react';

import type { EditorAction } from '../../../state/editor';
import { useEditor } from '../../../state/hooks';
import { useAnnounce } from '../../components/Announcer';
import { useCopy } from '../../components/copy';
import { useOutputs } from '../output/outputs';

interface GlobalShortcutsProps {
  /** `?` was pressed. */
  readonly onHelp: () => void;
}

/** Input types that take typed text, where single keys must stay theirs. */
const NON_TEXT_INPUTS: ReadonlySet<string> = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

const typesText = (el: Element): boolean =>
  (el instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(el.type)) ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement ||
  (el instanceof HTMLElement && el.isContentEditable);

const WORD_KEYS: ReadonlyMap<string, EditorAction> = new Map<string, EditorAction>([
  ['Backspace', { type: 'deleteBackward' }],
  ['Delete', { type: 'deleteForward' }],
  ['ArrowLeft', { type: 'moveCursor', delta: -1 }],
  ['ArrowRight', { type: 'moveCursor', delta: 1 }],
]);

/**
 * FR-51: page-wide shortcuts. Word keys act whenever focus isn't in a text
 * input, and leave alone keys a widget already handled (`defaultPrevented`:
 * the word display and the palette's arrow keys). Nothing fires from inside a
 * dialog. Renders nothing.
 */
export function GlobalShortcuts({ onHelp }: GlobalShortcutsProps) {
  const { dispatch } = useEditor();
  const outputs = useOutputs();
  const copy = useCopy();
  const announce = useAnnounce();

  // The listener is attached once; it reads the latest values through this ref.
  const latest = useRef({ dispatch, outputs, copy, announce, onHelp });
  useEffect(() => {
    latest.current = { dispatch, outputs, copy, announce, onHelp };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { target } = event;
      if (event.defaultPrevented || !(target instanceof Element)) return;
      if (typesText(target) || target.closest('dialog') !== null) return;
      const { dispatch, outputs, copy, announce, onHelp } = latest.current;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod && event.shiftKey && !event.altKey && (key === 'c' || key === 'l')) {
        event.preventDefault();
        if (outputs.empty) {
          announce('Nothing to copy yet');
          return;
        }
        void (key === 'c'
          ? copy(outputs.ipaCopied, 'Copied IPA')
          : copy(outputs.tipa, 'Copied TIPA'));
        return;
      }
      if (mod || event.altKey) return;
      if (event.key === '?') {
        event.preventDefault();
        onHelp();
        return;
      }
      const action = event.shiftKey ? undefined : WORD_KEYS.get(event.key);
      if (action === undefined) return;
      event.preventDefault();
      dispatch(action);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}
