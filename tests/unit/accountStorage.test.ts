import { describe, expect, it } from 'vitest';
import { LocalDatabase } from '../../src/main/database/LocalDatabase';
import { AccountRepository } from '../../src/main/database/repositories/AccountRepository';
import { AccountService } from '../../src/main/services/AccountService';
import type { VaultDecryptResult, VaultService } from '../../src/main/security/VaultService';

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
