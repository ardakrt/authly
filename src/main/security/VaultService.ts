export interface VaultDecryptResult {
  secret: string;
  reEncrypted?: Buffer;
}

export interface VaultService {
  encryptSecret(secret: string): Promise<Buffer>;
  decryptSecret(encryptedSecret: Buffer): Promise<VaultDecryptResult>;
}
