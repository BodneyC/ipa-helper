/** One row of the help dialog (FR-51). */
interface Shortcut {
  readonly keys: readonly string[];
  /** Pressed together (a chord), or any one of them. */
  readonly join: 'chord' | 'any';
  readonly does: string;
}

/** Every keyboard shortcut, as the help dialog lists them (FR-50, FR-51). */
export const SHORTCUTS: readonly Shortcut[] = [
  { keys: ['Tab'], join: 'any', does: 'Move between the word, its buttons and each symbol group' },
  { keys: ['←', '→', '↑', '↓'], join: 'any', does: 'Move between symbols in a group' },
  { keys: ['Enter'], join: 'any', does: 'Add the focused symbol at the cursor' },
  { keys: ['←', '→'], join: 'any', does: 'Move the word cursor (outside the symbol groups)' },
  { keys: ['Backspace'], join: 'any', does: 'Delete the symbol before the cursor' },
  { keys: ['Delete'], join: 'any', does: 'Delete the symbol after the cursor' },
  { keys: ['Ctrl', 'Z'], join: 'chord', does: 'Undo (with the word focused)' },
  { keys: ['Ctrl', 'Shift', 'Z'], join: 'chord', does: 'Redo (with the word focused)' },
  { keys: ['Ctrl', 'Shift', 'C'], join: 'chord', does: 'Copy the IPA' },
  { keys: ['Ctrl', 'Shift', 'L'], join: 'chord', does: 'Copy the TIPA' },
  { keys: ['?'], join: 'any', does: 'Show these shortcuts' },
  { keys: ['Esc'], join: 'any', does: 'Close a dialog or tooltip' },
];
