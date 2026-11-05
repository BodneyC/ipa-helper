import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UpdateNotice } from './UpdateNotice';
import { Providers } from '../../../app/providers';
import type { AppUpdates } from '../../../domain/ports';
import { AnnouncerProvider } from '../../components/Announcer';

/** Updates we control: `arrive()` makes a new version available. */
const fakeUpdates = () => {
  let available = false;
  const listeners = new Set<() => void>();
  const apply = vi.fn();
  const updates: AppUpdates = {
    available: () => available,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    apply,
  };
  const arrive = () => {
    available = true;
    for (const listener of listeners) listener();
  };
  return { updates, apply, arrive };
};

const setup = () => {
  const fake = fakeUpdates();
  render(
    <Providers services={{ updates: fake.updates }}>
      <AnnouncerProvider>
        <UpdateNotice />
      </AnnouncerProvider>
    </Providers>,
  );
  return { ...fake, user: userEvent.setup() };
};

const notice = () => screen.queryByRole('region', { name: 'Update' });

describe('<UpdateNotice>', () => {
  it('FR-62: shows nothing until a new version is waiting', () => {
    setup();
    expect(notice()).toBeNull();
  });

  it('FR-62: offers the new version and announces it', () => {
    const { arrive } = setup();
    act(arrive);
    expect(notice()).toHaveTextContent('A new version of ipa-helper is ready.');
    expect(screen.getByRole('status')).toHaveTextContent('A new version of ipa-helper is ready');
  });

  it('FR-62: Reload switches to the new version', async () => {
    const { arrive, apply, user } = setup();
    act(arrive);
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(apply).toHaveBeenCalledOnce();
  });

  it('FR-62: Later hides the notice without switching', async () => {
    const { arrive, apply, user } = setup();
    act(arrive);
    await user.click(screen.getByRole('button', { name: 'Later' }));
    expect(notice()).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });
});
