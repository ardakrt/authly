import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { App } from '../../src/renderer/src/app/App';
import { ThemeProvider } from '../../src/renderer/src/app/ThemeProvider';
import type { LockStatus } from '../../src/shared/schemas/lock';

let listener: (status: LockStatus) => void;
const account = {
  id: 'a4ff59c6-2df2-4136-86ba-78bd57a617d8',
  issuer: 'Existing fixture account',
  accountName: 'fixture',
  algorithm: 'SHA1' as const,
  digits: 6,
  period: 30,
  favorite: false,
  groupId: null,
  sortOrder: 0,
  createdAt: 1,
  updatedAt: 1,
};
const unlocked = { isLocked: false, isPinSet: true, autoLockTimeout: 5 };

beforeEach(() => {
  vi.mocked(window.authapp.onLockStatus).mockImplementation((callback) => {
    listener = callback;
    return () => {};
  });
  vi.mocked(window.authapp.getLockStatus).mockResolvedValue(unlocked);
  vi.mocked(window.authapp.listAccounts).mockResolvedValue([account]);
  vi.mocked(window.authapp.getTotpCodes).mockResolvedValue([
    { accountId: account.id, code: '000000', remaining: 15, period: 30 },
  ]);
});

function renderApp() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

it('loads accounts immediately after PIN unlock without changing window focus', async () => {
  let locked = true;
  vi.mocked(window.authapp.getLockStatus).mockImplementation(async () => ({
    ...unlocked,
    isLocked: locked,
  }));
  vi.mocked(window.authapp.verifyPin).mockImplementation(async () => {
    locked = false;
    return true;
  });
  const user = userEvent.setup();
  renderApp();
  expect(await screen.findByRole('dialog', { name: 'Authly Kilitli' })).toBeVisible();
  expect(window.authapp.listAccounts).not.toHaveBeenCalled();
  await user.keyboard('1234{Enter}');
  expect(await screen.findByText(account.issuer)).toBeVisible();
  expect(screen.queryByRole('dialog', { name: 'Authly Kilitli' })).not.toBeInTheDocument();
});

it('unmounts sensitive account and form state on lock and reloads on the next unlock', async () => {
  renderApp();
  expect(await screen.findByText(account.issuer)).toBeVisible();
  act(() => listener({ ...unlocked, isLocked: true }));
  expect(screen.queryByText(account.issuer)).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Authly Kilitli' })).toBeVisible();
  act(() => listener(unlocked));
  expect(await screen.findByText(account.issuer)).toBeVisible();
  expect(window.authapp.listAccounts).toHaveBeenCalledTimes(2);
});

it('fails closed when the initial lock status cannot be obtained', async () => {
  vi.mocked(window.authapp.getLockStatus).mockRejectedValue(new Error('Fixture unavailable'));
  renderApp();
  expect(await screen.findByText('Kilit durumu alınamadı. Yeniden deneyin.')).toBeVisible();
  expect(window.authapp.listAccounts).not.toHaveBeenCalled();
  expect(screen.queryByText(account.issuer)).not.toBeInTheDocument();
});

it('ignores an initial unlocked snapshot that arrives after a newer locked event', async () => {
  let finish!: (status: LockStatus) => void;
  vi.mocked(window.authapp.getLockStatus).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  renderApp();
  act(() => listener({ ...unlocked, isLocked: true }));
  await act(async () => finish(unlocked));
  await waitFor(() => expect(screen.getByRole('dialog', { name: 'Authly Kilitli' })).toBeVisible());
  expect(window.authapp.listAccounts).not.toHaveBeenCalled();
});
