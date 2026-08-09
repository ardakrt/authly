import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '../../src/shared/ipc/channels';

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
  beforeEach(() => {
    removeAppHandlers();
    handlers.clear();
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
