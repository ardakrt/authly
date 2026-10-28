import { describe, expect, it } from 'vitest';
import { LocalDatabase } from '../../src/main/database/LocalDatabase';
import { AccountRepository } from '../../src/main/database/repositories/AccountRepository';
import { AccountService } from '../../src/main/services/AccountService';
import type { VaultDecryptResult, VaultService } from '../../src/main/security/VaultService';
import { TotpService } from '../../src/main/services/TotpService';

class TestVault implements VaultService {
  async encryptSecret(secret: string): Promise<Buffer> {
    return Buffer.from([...Buffer.from(secret)].map((byte) => byte ^ 0xaa));
  }

  async decryptSecret(encryptedSecret: Buffer): Promise<VaultDecryptResult> {
    return {
      secret: Buffer.from([...encryptedSecret].map((byte) => byte ^ 0xaa)).toString(),
    };
  }
}

const input = {
  issuer: 'Test Service',
  accountName: 'local@example.test',
  secret: 'JBSWY3DPEHPK3PXP',
  algorithm: 'SHA1' as const,
  digits: 6,
  period: 30,
  favorite: false,
  groupId: null,
};

describe('local encrypted account storage', () => {
  it('rejects malformed secrets on create and update without changing storage', async () => {
    const database = new LocalDatabase(':memory:');
    try {
      const repository = new AccountRepository(database.connection);
      const service = new AccountService(repository, new TestVault(), new TotpService());
      await expect(service.create({ ...input, secret: 'INVALID!' })).rejects.toThrow();
      expect(service.list()).toHaveLength(0);
      const created = await service.create(input);
      await expect(
        service.update({ ...input, id: created.id, secret: 'INVALID!' }),
      ).rejects.toThrow();
      await expect(service.getTotpCode(created.id)).resolves.toMatchObject({
        accountId: created.id,
      });
    } finally {
      database.close();
    }
  });

  it('isolates a legacy broken account while healthy accounts still generate and copy codes', async () => {
    const database = new LocalDatabase(':memory:');
    try {
      const repository = new AccountRepository(database.connection);
      const vault = new TestVault();
      const service = new AccountService(repository, vault, new TotpService());
      const healthy = await service.create(input);
      const broken = await service.create({ ...input, accountName: 'broken' });
      repository.updateEncryptedSecret(broken.id, await vault.encryptSecret('INVALID!'));
      const codes = await service.getTotpCodes();
      expect(codes.map(({ accountId }) => accountId)).toEqual([healthy.id]);
      await expect(service.getTotpCode(healthy.id)).resolves.toHaveProperty(
        'accountId',
        healthy.id,
      );
      await expect(service.getTotpCode(broken.id)).rejects.toThrow();
      expect(service.list()).toHaveLength(2);
    } finally {
      database.close();
    }
  });

  it('imports encrypted accounts in order and returns only safe metadata', async () => {
    const database = new LocalDatabase(':memory:');
    try {
      const repository = new AccountRepository(database.connection);
      const service = new AccountService(repository, new TestVault());
      const result = await service.importAccounts({
        accounts: [input, { ...input, accountName: 'second' }],
      });
      expect(result.map(({ sortOrder }) => sortOrder)).toEqual([0, 1]);
      expect(service.list()).toHaveLength(2);
      for (const account of result) {
        expect(account).not.toHaveProperty('secret');
        expect(account).not.toHaveProperty('encryptedSecret');
        expect(repository.getById(account.id)?.encryptedSecret.toString()).not.toContain(
          input.secret,
        );
      }
    } finally {
      database.close();
    }
  });

  it('rolls back every account if a later database insert fails', async () => {
    const database = new LocalDatabase(':memory:');
    try {
      const service = new AccountService(
        new AccountRepository(database.connection),
        new TestVault(),
      );
      const existing = await service.create(input);
      await expect(
        service.importAccounts({
          accounts: [input, { ...input, groupId: 'a4ff59c6-2df2-4136-86ba-78bd57a617d8' }],
        }),
      ).rejects.toThrow();
      expect(service.list().map(({ id }) => id)).toEqual([existing.id]);
      await service.importAccounts({ accounts: [input] });
      expect(service.list()).toHaveLength(2);
    } finally {
      database.close();
    }
  });

  it('writes nothing if validation, encryption or the final lock check fails', async () => {
    const database = new LocalDatabase(':memory:');
    try {
      const vault = new TestVault();
      const service = new AccountService(new AccountRepository(database.connection), {
        encryptSecret: async (secret) => {
          if (secret === 'AAAAAAAA') throw new Error('Encryption unavailable');
          return vault.encryptSecret(secret);
        },
        decryptSecret: (value) => vault.decryptSecret(value),
      });
      await expect(
        service.importAccounts({ accounts: [input, { ...input, secret: 'INVALID!' }] }),
      ).rejects.toThrow();
      await expect(
        service.importAccounts({ accounts: [input, { ...input, secret: 'AAAAAAAA' }] }),
      ).rejects.toThrow();
      await expect(
        service.importAccounts({ accounts: [input] }, () => {
          throw new Error('Locked');
        }),
      ).rejects.toThrow('Locked');
      expect(service.list()).toHaveLength(0);
    } finally {
      database.close();
    }
  });

  it('migrates idempotently and stores no plaintext secret', async () => {
    const database = new LocalDatabase(':memory:');
    const repository = new AccountRepository(database.connection);
    const service = new AccountService(repository, new TestVault());

    const created = await service.create(input);
    const stored = repository.getById(created.id);

    expect(created).not.toHaveProperty('secret');
    expect(created).not.toHaveProperty('encryptedSecret');
    expect(stored?.encryptedSecret.toString()).not.toContain(input.secret);
    expect(service.list()).toEqual([created]);
    await expect(service.getTotpSecret(created.id)).resolves.toEqual({
      secret: input.secret,
      algorithm: input.algorithm,
      digits: input.digits,
      period: input.period,
    });
    expect(
      database.connection.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get(),
    ).toEqual({ count: 1 });

    const updated = await service.update({ ...input, id: created.id, favorite: true });
    expect(updated.favorite).toBe(true);

    service.delete(created.id);
    expect(service.list()).toEqual([]);
    database.close();
  });

  it('fails closed when OS encryption is unavailable', async () => {
    const database = new LocalDatabase(':memory:');
    const repository = new AccountRepository(database.connection);
    const unavailableVault: VaultService = {
      encryptSecret: () => Promise.reject(new Error('unavailable')),
      decryptSecret: () => Promise.reject(new Error('unavailable')),
    };
    const service = new AccountService(repository, unavailableVault);

    await expect(service.create(input)).rejects.toThrow('unavailable');
    expect(repository.list()).toEqual([]);
    database.close();
  });
});
