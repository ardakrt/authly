import { describe, expect, it, vi } from 'vitest';
import { BackupService } from '../../src/main/services/BackupService';
import type { AccountService } from '../../src/main/services/AccountService';
import { dialog } from 'electron';
import * as fs from 'node:fs';

vi.mock('electron', () => ({
  dialog: {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
  },
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe('BackupService', () => {
  it('exports encrypted backup with AES-256-GCM and PBKDF2', async () => {
    const mockAccountService = {
      list: vi.fn().mockReturnValue([
        {
          id: '11111111-1111-1111-1111-111111111111',
          issuer: 'Google',
          accountName: 'test@gmail.com',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          favorite: false,
          groupId: null,
        },
      ]),
      getTotpSecret: vi.fn().mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      }),
    } as unknown as AccountService;

    vi.mocked(dialog.showSaveDialog).mockResolvedValueOnce({
      canceled: false,
      filePath: 'C:/test/backup.authapp',
    });

    let savedContent = '';
    vi.mocked(fs.writeFileSync).mockImplementation((_path, content) => {
      savedContent = String(content);
    });

    const service = new BackupService(mockAccountService);
    const result = await service.exportBackup('secret-pass-123');

    expect(result.success).toBe(true);
    expect(result.exportedCount).toBe(1);
    expect(savedContent).toContain('authapp-backup-v1');
    expect(savedContent).toContain('pbkdf2');
    expect(savedContent).toContain('aes-256-gcm');
  });

  it('fails import when password is incorrect', async () => {
    const mockAccountService = {
      list: vi.fn().mockReturnValue([]),
      create: vi.fn(),
    } as unknown as AccountService;

    vi.mocked(dialog.showOpenDialog).mockResolvedValueOnce({
      canceled: false,
      filePaths: ['C:/test/backup.authapp'],
    });

    const sampleEnvelope = {
      format: 'authapp-backup-v1',
      kdf: {
        algorithm: 'pbkdf2',
        iterations: 1000,
        hash: 'sha256',
        salt: '00112233445566778899aabbccddeeff',
      },
      cipher: {
        algorithm: 'aes-256-gcm',
        iv: '00112233445566778899aabb',
        authTag: '00112233445566778899aabbccddeeff',
      },
      encryptedData: 'deadbeef',
    };

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(sampleEnvelope));

    const service = new BackupService(mockAccountService);
    await expect(service.importBackup('wrong-pass')).rejects.toThrow('Parola hatalı');
  });
});
