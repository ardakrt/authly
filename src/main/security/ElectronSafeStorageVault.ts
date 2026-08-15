import { safeStorage } from 'electron';
import type { VaultDecryptResult, VaultService } from './VaultService';

export class ElectronSafeStorageVault implements VaultService {
  constructor(private readonly allowInsecureLinuxBackend = false) {}

  async encryptSecret(secret: string): Promise<Buffer> {
    await this.assertSecureStorageAvailable();
    return safeStorage.encryptStringAsync(secret);
  }

  async decryptSecret(encryptedSecret: Buffer): Promise<VaultDecryptResult> {
    await this.assertSecureStorageAvailable();
    const result = await safeStorage.decryptStringAsync(encryptedSecret);
    return {
      secret: result.result,
      ...(result.shouldReEncrypt
        ? { reEncrypted: await safeStorage.encryptStringAsync(result.result) }
        : {}),
    };
  }

  private async assertSecureStorageAvailable(): Promise<void> {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
      throw new Error('Secure OS encryption is unavailable.');
    }

    if (
      process.platform === 'linux' &&
      !this.allowInsecureLinuxBackend &&
      safeStorage.getSelectedStorageBackend() === 'basic_text'
    ) {
      throw new Error(
        'Secure OS keyring is unavailable. Install and unlock GNOME Keyring or KWallet.',
      );
    }
  }
}
