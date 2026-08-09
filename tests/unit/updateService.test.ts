import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { UpdateService } from '../../src/main/services/UpdateService';
import { app } from 'electron';

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn().mockReturnValue('0.1.0'),
  },
}));

describe('UpdateService', () => {
  let service: UpdateService;

  beforeEach(() => {
    service = new UpdateService('ardakrt', 'authly');
    vi.restoreAllMocks();
    (app.getVersion as ReturnType<typeof vi.fn>).mockReturnValue('0.1.0');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isNewerVersion', () => {
    it('returns true when latest version is newer than current version', () => {
      expect(service.isNewerVersion('0.2.0', '0.1.0')).toBe(true);
      expect(service.isNewerVersion('1.0.0', '0.9.9')).toBe(true);
      expect(service.isNewerVersion('0.1.1', '0.1.0')).toBe(true);
    });

    it('returns false when latest version is equal or older than current version', () => {
      expect(service.isNewerVersion('0.1.0', '0.1.0')).toBe(false);
      expect(service.isNewerVersion('0.0.9', '0.1.0')).toBe(false);
      expect(service.isNewerVersion('0.1.0', '0.2.0')).toBe(false);
    });
  });

  describe('checkForUpdates', () => {
    it('handles 404 when no release exists on GitHub yet', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
        }),
      );

      const result = await service.checkForUpdates();
      expect(result.hasUpdate).toBe(false);
      expect(result.currentVersion).toBe('0.1.0');
      expect(result.error).toBe('Henüz GitHub üzerinde yayınlanmış bir sürüm bulunamadı.');
    });

    it('detects available update from GitHub API response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            tag_name: 'v0.2.0',
            html_url: 'https://github.com/ardakrt/authly/releases/tag/v0.2.0',
            body: 'Release notes v0.2.0',
          }),
        }),
      );

      const result = await service.checkForUpdates();
      expect(result.hasUpdate).toBe(true);
      expect(result.latestVersion).toBe('0.2.0');
      expect(result.releaseUrl).toBe('https://github.com/ardakrt/authly/releases/tag/v0.2.0');
    });

    it('handles network errors gracefully', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const result = await service.checkForUpdates();
      expect(result.hasUpdate).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});
