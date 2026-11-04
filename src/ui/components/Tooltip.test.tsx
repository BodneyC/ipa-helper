import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Tooltip } from './Tooltip';

const anchorAt = (top: number, left = 100) => {
  const anchor = document.createElement('button');
  document.body.append(anchor);
  vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: left, y: top, width: 40, height: 40 }),
  );
  return anchor;
};

const mockTooltipSize = () =>
  vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockReturnValue(DOMRect.fromRect({ width: 120, height: 50 }));

describe('<Tooltip>', () => {
  it('is in the DOM but hidden while closed, so aria-describedby can reach it', () => {
    render(
      <Tooltip id="t" anchor={null} open={false}>
        hint
      </Tooltip>,
    );
    expect(document.getElementById('t')).toHaveAttribute('hidden');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('sits centred above its anchor when there is room', () => {
    const anchor = anchorAt(300);
    mockTooltipSize();
    render(
      <Tooltip id="t" anchor={anchor} open>
        hint
      </Tooltip>,
    );
    const tip = screen.getByRole('tooltip');
    expect(tip.style.top).toBe('242px'); // 300 - 50 - 8
    expect(tip.style.left).toBe('60px'); // 100 + 20 - 60
    expect(tip).toHaveAttribute('data-placement', 'above');
  });

  it('flips below the anchor near the top of the viewport and stays on screen', () => {
    const anchor = anchorAt(10, 0);
    mockTooltipSize();
    render(
      <Tooltip id="t" anchor={anchor} open>
        hint
      </Tooltip>,
    );
    const tip = screen.getByRole('tooltip');
    expect(tip.style.top).toBe('58px'); // 10 + 40 + 8
    expect(tip.style.left).toBe('8px');
    expect(tip).toHaveAttribute('data-placement', 'below');
  });

  it('renders inside the anchor’s <main> landmark when there is one', () => {
    const main = document.createElement('main');
    const anchor = document.createElement('button');
    main.append(anchor);
    document.body.append(main);
    render(
      <Tooltip id="t" anchor={anchor} open>
        hint
      </Tooltip>,
    );
    expect(main).toContainElement(screen.getByRole('tooltip'));
    main.remove();
  });

  it('keeps clear of the right edge', () => {
    const anchor = anchorAt(300, window.innerWidth - 20);
    mockTooltipSize();
    render(
      <Tooltip id="t" anchor={anchor} open>
        hint
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip').style.left).toBe(`${String(window.innerWidth - 128)}px`);
  });
});
