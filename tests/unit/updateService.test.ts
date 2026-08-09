import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUpdater, UpdateDownloadedEvent } from 'electron-updater';
import { UpdateService } from '../../src/main/services/UpdateService';

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn().mockReturnValue('0.1.0'),
    isPackaged: true,
  },
}));

vi.mock('electron-updater', () => ({
  default: { autoUpdater: {} },
}));

type FakeUpdater = AppUpdater & {
  checkForUpdates: ReturnType<typeof vi.fn>;
  downloadUpdate: ReturnType<typeof vi.fn>;
  quitAndInstall: ReturnType<typeof vi.fn>;
};

function createUpdater(): FakeUpdater {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    autoDownload: true,
    autoInstallOnAppQuit: false,
    autoRunAppAfterInstall: false,
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
  }) as unknown as FakeUpdater;
}

function updateResult(
  version: string,
): NonNullable<Awaited<ReturnType<AppUpdater['checkForUpdates']>>> {
  return {
    updateInfo: {
      version,
      files: [],
      path: `Authly Setup ${version}.exe`,
      sha512: 'test',
      releaseDate: '2026-08-09T00:00:00.000Z',
      releaseNotes: `Release ${version}`,
    },
  } as unknown as NonNullable<Awaited<ReturnType<AppUpdater['checkForUpdates']>>>;
}

describe('UpdateService', () => {
  let updater: FakeUpdater;
  let service: UpdateService;

  beforeEach(() => {
    updater = createUpdater();
    service = new UpdateService({
      updater,
      isPackaged: true,
      currentVersion: '0.1.0',
      installDelayMs: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('compares semantic version components', () => {
    expect(service.isNewerVersion('0.2.0', '0.1.0')).toBe(true);
    expect(service.isNewerVersion('1.0.0', '0.9.9')).toBe(true);
    expect(service.isNewerVersion('0.1.0', '0.1.0')).toBe(false);
    expect(service.isNewerVersion('0.0.9', '0.1.0')).toBe(false);
  });

  it('detects an available update through electron-updater', async () => {
    updater.checkForUpdates.mockResolvedValue(updateResult('0.2.0'));

    const result = await service.checkForUpdates();

    expect(result.hasUpdate).toBe(true);
    expect(result.latestVersion).toBe('0.2.0');
    expect(result.releaseUrl).toBe('https://github.com/ardakrt/authly/releases/tag/v0.2.0');
    expect(service.getState()).toMatchObject({ phase: 'available', latestVersion: '0.2.0' });
  });

  it('reports update check errors without crashing the app', async () => {
    updater.checkForUpdates.mockRejectedValue(new Error('Network error'));

    const result = await service.checkForUpdates();

    expect(result.hasUpdate).toBe(false);
    expect(result.error).toBe('Network error');
    expect(service.getState()).toMatchObject({ phase: 'error', error: 'Network error' });
  });

  it('downloads, reports progress, installs silently, and restarts the app', async () => {
    vi.useFakeTimers();
    const beforeInstall = vi.fn();
    service = new UpdateService({
      updater,
      isPackaged: true,
      currentVersion: '0.1.0',
      beforeInstall,
      installDelayMs: 0,
    });
    updater.checkForUpdates.mockResolvedValue(updateResult('0.2.0'));
    updater.downloadUpdate.mockImplementation(async () => {
      updater.emit('download-progress', {
        bytesPerSecond: 1024,
        percent: 42,
        total: 100,
        transferred: 42,
        delta: 42,
      });
      updater.emit(
        'update-downloaded',
        updateResult('0.2.0').updateInfo as unknown as UpdateDownloadedEvent,
      );
      return ['C:/update/Authly Setup 0.2.0.exe'];
    });

    await service.checkForUpdates();
    await service.downloadAndInstall();

    expect(updater.downloadUpdate).toHaveBeenCalledOnce();
    expect(service.getState()).toMatchObject({
      phase: 'downloaded',
      latestVersion: '0.2.0',
      progress: 100,
    });
    vi.runAllTimers();
    expect(beforeInstall).toHaveBeenCalledOnce();
    expect(updater.quitAndInstall).toHaveBeenCalledWith(true, true);
  });
});
