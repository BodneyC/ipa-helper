import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnnouncerProvider, useAnnounce } from './Announcer';

describe('<AnnouncerProvider>', () => {
  it('FR-23: renders one polite live region that announces messages', () => {
    let announce: (message: string) => void = () => undefined;
    function Probe() {
      announce = useAnnounce();
      return null;
    }
    render(
      <AnnouncerProvider>
        <Probe />
      </AnnouncerProvider>,
    );
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    act(() => {
      announce('Copied IPA');
    });
    expect(region).toHaveTextContent('Copied IPA');
    const before = region.firstElementChild;
    act(() => {
      announce('Copied IPA');
    });
    // The same message again gets a new node, so screen readers repeat it.
    expect(region.firstElementChild).not.toBe(before);
  });

  it('is a no-op outside the provider', () => {
    const { result } = renderHook(() => useAnnounce());
    expect(() => {
      result.current('ignored');
    }).not.toThrow();
  });
});
