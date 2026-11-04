import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { HelpDialog } from './HelpDialog';

function Fixture() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Help
      </button>
      <HelpDialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}

describe('<HelpDialog> (FR-51)', () => {
  it('opens as a named dialog listing the shortcuts', async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Help' }));
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    const rows = within(dialog).getAllByRole('rowheader');
    expect(rows.map((r) => r.textContent)).toContain('Ctrl + Shift + C');
    expect(rows.map((r) => r.textContent)).toContain('← → ↑ ↓');
    expect(within(dialog).getByRole('cell', { name: 'Copy the TIPA' })).toBeInTheDocument();
  });

  it('closes from its Close button, or when the browser closes it (Escape), and refocuses the opener', async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    const opener = screen.getByRole('button', { name: 'Help' });
    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await user.click(opener);
    const dialog = screen.getByRole('dialog');
    dialog.dispatchEvent(new Event('close'));
    expect(await screen.findByRole('button', { name: 'Help' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
