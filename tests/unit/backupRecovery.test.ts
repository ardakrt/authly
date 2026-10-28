import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LocalDatabase } from '../../src/main/database/LocalDatabase';
import { AccountRepository } from '../../src/main/database/repositories/AccountRepository';
import { GroupRepository } from '../../src/main/database/repositories/GroupRepository';
import { AccountService } from '../../src/main/services/AccountService';
import { BackupService } from '../../src/main/services/BackupService';
import type { VaultService } from '../../src/main/security/VaultService';
import { dialog } from 'electron';
import * as fs from 'node:fs';

vi.mock('electron', () => ({ dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() } }));
vi.mock('node:fs', async (original) => ({
  ...(await original<typeof import('node:fs')>()),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

const databases: LocalDatabase[] = [];
const password = 'synthetic-password';
const group = {
  id: 'a4ff59c6-2df2-4136-86ba-78bd57a617d8',
  name: 'Fixture group',
  sortOrder: 0,
  createdAt: 1,
  updatedAt: 1,
};
const account = {
  issuer: 'Fixture',
  accountName: 'fixture',
  secret: 'JBSWY3DPEHPK3PXP',
  algorithm: 'SHA1' as const,
  digits: 6,
  period: 30,
  favorite: false,
  groupId: null,
};
const vault: VaultService = {
  encryptSecret: async (value) => Buffer.from([...Buffer.from(value)].map((byte) => byte ^ 0xaa)),
  decryptSecret: async (value) => ({
    secret: Buffer.from([...value].map((byte) => byte ^ 0xaa)).toString(),
  }),
};

function fixture(storage = vault) {
  const database = new LocalDatabase(':memory:');
  databases.push(database);
  const groups = new GroupRepository(database.connection);
  const accounts = new AccountService(
    new AccountRepository(database.connection),
    storage,
    undefined,
    groups,
  );
  return { database, groups, accounts, backup: new BackupService(accounts) };
}

function provideFile(content: string) {
  vi.mocked(fs.statSync).mockReturnValue({ size: Buffer.byteLength(content) } as fs.Stats);
  vi.mocked(fs.readFileSync).mockReturnValue(content);
}

function providePayload(payload: unknown) {
  const salt = randomBytes(16),
    iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, 100_000, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]);
  provideFile(
    JSON.stringify({
      format: 'authapp-backup-v1',
      kdf: { algorithm: 'pbkdf2', iterations: 100_000, hash: 'sha256', salt: salt.toString('hex') },
      cipher: {
        algorithm: 'aes-256-gcm',
        iv: iv.toString('hex'),
        authTag: cipher.getAuthTag().toString('hex'),
      },
      encryptedData: encrypted.toString('hex'),
    }),
  );
}

beforeEach(() => {
  vi.mocked(dialog.showOpenDialog).mockResolvedValue({
    canceled: false,
    filePaths: ['fixture.authapp'],
  });
  vi.mocked(dialog.showSaveDialog).mockResolvedValue({
    canceled: false,
    filePath: 'fixture.authapp',
  });
});
afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

it('round-trips encrypted grouped and ungrouped accounts onto a fresh database', async () => {
  const source = fixture(),
    target = fixture();
  source.groups.create(group);
  await source.accounts.create({ ...account, groupId: group.id });
  await source.accounts.create({ ...account, accountName: 'ungrouped' });
  let encryptedFile = '';
  vi.mocked(fs.writeFileSync).mockImplementation((_path, content) => {
    encryptedFile = String(content);
  });
  await source.backup.exportBackup(password);
  provideFile(encryptedFile);
  expect(await target.backup.importBackup(password)).toEqual({
    success: true,
    importedCount: 2,
    skippedCount: 0,
    ungroupedCount: 0,
  });
  const restoredGroup = target.groups.list()[0]!;
  expect(restoredGroup.name).toBe(group.name);
  expect(target.accounts.list().find((item) => item.accountName === 'fixture')?.groupId).toBe(
    restoredGroup.id,
  );
});

it('restores every legacy v1 account and reports missing group metadata instead of skipping it', async () => {
  const target = fixture();
  providePayload({
    version: 1,
    exportedAt: 1,
    accounts: [
      { ...account, groupId: group.id },
      { ...account, accountName: 'second' },
    ],
  });
  expect(await target.backup.importBackup(password)).toEqual({
    success: true,
    importedCount: 2,
    skippedCount: 0,
    ungroupedCount: 1,
  });
  expect(target.accounts.list()).toHaveLength(2);
  expect(target.accounts.list().every((item) => item.groupId === null)).toBe(true);
});

it('rolls back groups and earlier accounts when a later account insert fails', async () => {
  const target = fixture();
  target.database.connection.exec(
    "CREATE TRIGGER reject_fixture BEFORE INSERT ON accounts WHEN NEW.account_name = 'fail' BEGIN SELECT RAISE(ABORT, 'fixture'); END",
  );
  providePayload({
    version: 2,
    exportedAt: 1,
    groups: [group],
    accounts: [
      { ...account, groupId: group.id },
      { ...account, accountName: 'fail' },
    ],
  });
  await expect(target.backup.importBackup(password)).rejects.toThrow();
  expect(target.accounts.list()).toHaveLength(0);
  expect(target.groups.list()).toHaveLength(0);
});

it('does not partially restore when encryption is unavailable', async () => {
  let attempts = 0;
  const target = fixture({
    ...vault,
    encryptSecret: async (value) => {
      if (++attempts === 2) throw new Error('Fixture encryption unavailable');
      return vault.encryptSecret(value);
    },
  });
  providePayload({
    version: 2,
    exportedAt: 1,
    groups: [group],
    accounts: [{ ...account, groupId: group.id }, account],
  });
  await expect(target.backup.importBackup(password)).rejects.toThrow();
  expect(target.accounts.list()).toHaveLength(0);
  expect(target.groups.list()).toHaveLength(0);
});

it('rejects incomplete v2 group references before any database write', async () => {
  const target = fixture();
  providePayload({
    version: 2,
    exportedAt: 1,
    groups: [],
    accounts: [{ ...account, groupId: group.id }],
  });
  await expect(target.backup.importBackup(password)).rejects.toThrow('eksik grup');
  expect(target.accounts.list()).toHaveLength(0);
});

it('rechecks access after a native dialog and never reads or writes backup data while locked', async () => {
  const target = fixture();
  let finish!: (value: Electron.SaveDialogReturnValue) => void;
  vi.mocked(dialog.showSaveDialog).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  let locked = false;
  const result = target.backup.exportBackup(password, () => {
    if (locked) throw new Error('Locked');
  });
  locked = true;
  finish({ canceled: false, filePath: 'fixture.authapp' });
  await expect(result).rejects.toThrow('Locked');
  expect(fs.writeFileSync).not.toHaveBeenCalled();
});
