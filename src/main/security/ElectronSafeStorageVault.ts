import { safeStorage } from 'electron';
import type { VaultDecryptResult, VaultService } from './VaultService';

export class ElectronSafeStorageVault implements VaultService {
  async encryptSecret(secret: string): Promise<Buffer> {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
      throw new Error('Secure OS encryption is unavailable.');
    }
    return safeStorage.encryptStringAsync(secret);
  }

  async decryptSecret(encryptedSecret: Buffer): Promise<VaultDecryptResult> {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
      throw new Error('Secure OS encryption is unavailable.');
    }
    const result = await safeStorage.decryptStringAsync(encryptedSecret);
    return {
      secret: result.result,
      ...(result.shouldReEncrypt
        ? { reEncrypted: await safeStorage.encryptStringAsync(result.result) }
        : {}),
    };
  }
}
