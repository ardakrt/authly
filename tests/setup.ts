import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(): void {
    this.setAttribute('open', '');
  };
}

if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close(): void {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

Object.defineProperty(window, 'authapp', {
  configurable: true,
  value: {
    getRuntimeInfo: vi.fn().mockResolvedValue({
      appName: 'Authly',
      appVersion: '0.3.5',
      platform: 'win32',
      packaged: false,
    }),
    listAccounts: vi.fn().mockResolvedValue([]),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    getTotpCodes: vi.fn().mockResolvedValue([]),
    parseOtpAuthUri: vi.fn(),
    copyTotp: vi.fn(),
    exportBackup: vi
      .fn()
      .mockResolvedValue({ success: true, filePath: '/mock.authapp', exportedCount: 1 }),
    importBackup: vi.fn().mockResolvedValue({ success: true, importedCount: 1, skippedCount: 0 }),
    getSettings: vi.fn().mockResolvedValue({
      theme: 'system',
      closeToTray: true,
      startMinimized: false,
    }),
    updateSettings: vi
      .fn()
      .mockImplementation((req: Record<string, unknown>) =>
        Promise.resolve({ theme: 'system', closeToTray: true, startMinimized: false, ...req }),
      ),
    getLockStatus: vi
      .fn()
      .mockResolvedValue({ isPinSet: false, isLocked: false, autoLockTimeout: 5 }),
    verifyPin: vi.fn().mockResolvedValue(true),
    setPin: vi.fn().mockResolvedValue(undefined),
    removePin: vi.fn().mockResolvedValue(undefined),
    lockApp: vi.fn().mockResolvedValue(undefined),
    checkUpdate: vi.fn().mockResolvedValue({
      hasUpdate: false,
      currentVersion: '0.3.5',
      latestVersion: '0.3.5',
    }),
    getUpdateState: vi.fn().mockResolvedValue({
      phase: 'idle',
      currentVersion: '0.3.5',
    }),
    installUpdate: vi.fn().mockResolvedValue(undefined),
    onUpdateState: vi.fn().mockReturnValue(() => {}),
  },
});
