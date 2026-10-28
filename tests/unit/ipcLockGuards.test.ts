import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '../../src/shared/ipc/channels';
import { clipboard } from 'electron';

type InvokeHandler = (
  event: { senderFrame?: { url: string } },
  request: unknown,
) => unknown | Promise<unknown>;

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, InvokeHandler>(),
}));

vi.mock('electron', () => ({
  app: {
    getName: vi.fn().mockReturnValue('Authly'),
    getVersion: vi.fn().mockReturnValue('0.3.4'),
    isPackaged: true,
  },
  clipboard: {
    clear: vi.fn(),
    readText: vi.fn().mockReturnValue(''),
    writeText: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: InvokeHandler) => handlers.set(channel, handler)),
    removeHandler: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
}));

import { registerAppHandlers, removeAppHandlers } from '../../src/main/ipc/registerAppHandlers';

describe('sensitive IPC lock guards', () => {
  const importRequest = {
    accounts: [{ issuer: 'Fixture', accountName: 'fixture', secret: 'JBSWY3DPEHPK3PXP' }],
  };

  beforeEach(() => {
    removeAppHandlers();
    handlers.clear();
  });

  it('rejects locked, untrusted and malformed batch imports before calling the service', async () => {
    const importAccounts = vi.fn();
    const assertNotLocked = vi.fn();
    const services = [
      { importAccounts },
      {},
      {},
      {},
      { assertNotLocked },
      {},
    ] as unknown as Parameters<typeof registerAppHandlers>;
    registerAppHandlers(...services);
    const invoke = handlers.get(IPC_CHANNELS.importAccounts)!;
    await expect(
      invoke({ senderFrame: { url: 'https://example.invalid' } }, importRequest),
    ).rejects.toThrow();
    await expect(
      invoke({ senderFrame: { url: 'authapp://app/index.html' } }, { accounts: [] }),
    ).rejects.toThrow();
    assertNotLocked.mockImplementation(() => {
      throw new Error('Locked');
    });
    await expect(
      invoke({ senderFrame: { url: 'authapp://app/index.html' } }, importRequest),
    ).rejects.toThrow();
    expect(importAccounts).not.toHaveBeenCalled();
  });

  it('passes normalized batch input and a final lock guard through the named IPC contract', async () => {
    const assertNotLocked = vi.fn();
    const importAccounts = vi.fn().mockImplementation(async (_input, guard: () => void) => {
      guard();
      return [];
    });
    const services = [
      { importAccounts },
      {},
      {},
      {},
      { assertNotLocked },
      {},
    ] as unknown as Parameters<typeof registerAppHandlers>;
    registerAppHandlers(...services);
    await expect(
      handlers.get(IPC_CHANNELS.importAccounts)!(
        { senderFrame: { url: 'authapp://app/index.html' } },
        importRequest,
      ),
    ).resolves.toEqual([]);
    expect(importAccounts).toHaveBeenCalledTimes(1);
    expect(assertNotLocked).toHaveBeenCalledTimes(2);
  });

  it('copies only the requested account without generating other accounts', async () => {
    vi.useFakeTimers();
    try {
      const accountId = 'a4ff59c6-2df2-4136-86ba-78bd57a617d8';
      const getTotpCode = vi
        .fn()
        .mockResolvedValue({ accountId, code: '000000', period: 30, remaining: 15 });
      const getTotpCodes = vi.fn().mockRejectedValue(new Error('Unrelated broken account'));
      const services = [
        { getTotpCode, getTotpCodes },
        {},
        {},
        {},
        { assertNotLocked: vi.fn() },
        {},
      ] as unknown as Parameters<typeof registerAppHandlers>;
      registerAppHandlers(...services);
      await handlers.get(IPC_CHANNELS.copyTotp)!(
        { senderFrame: { url: 'authapp://app/index.html' } },
        { accountId },
      );
      expect(getTotpCode).toHaveBeenCalledWith(accountId);
      expect(getTotpCodes).not.toHaveBeenCalled();
      expect(clipboard.writeText).toHaveBeenCalledTimes(1);
      vi.runOnlyPendingTimers();
    } finally {
      vi.useRealTimers();
    }
  });

  it('blocks TOTP copy and backup operations while the app is locked', async () => {
    const assertNotLocked = vi.fn(() => {
      throw new Error('Uygulama kilitli.');
    });
    const services = [
      { getTotpCodes: vi.fn() },
      {},
      { exportBackup: vi.fn(), importBackup: vi.fn() },
      {},
      { assertNotLocked },
      {},
    ] as unknown as Parameters<typeof registerAppHandlers>;

    registerAppHandlers(...services);
    const event = { senderFrame: { url: 'authapp://app/index.html' } };

    await expect(
      handlers.get(IPC_CHANNELS.copyTotp)?.(event, {
        accountId: '11111111-1111-1111-1111-111111111111',
      }),
    ).rejects.toThrow();
    await expect(
      handlers.get(IPC_CHANNELS.exportBackup)?.(event, { password: 'strong-pass-123' }),
    ).rejects.toThrow();
    await expect(
      handlers.get(IPC_CHANNELS.importBackup)?.(event, { password: 'strong-pass-123' }),
    ).rejects.toThrow();

    expect(assertNotLocked).toHaveBeenCalledTimes(3);
  });
});
