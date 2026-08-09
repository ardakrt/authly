import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import { dialog } from 'electron';
import type { AccountService } from './AccountService';
import {
  backupFileEnvelopeSchema,
  backupPayloadSchema,
  type ExportBackupResult,
  type ImportBackupResult,
} from '@shared/schemas/backup';

export class BackupService {
  constructor(private readonly accountService: AccountService) {}

  async exportBackup(password: string): Promise<ExportBackupResult> {
    const saveDialogResult = await dialog.showSaveDialog({
      title: 'Şifreli Yedek Kaydet',
      defaultPath: `authapp-backup-${new Date().toISOString().slice(0, 10)}.authapp`,
      filters: [{ name: 'Authapp Backup (*.authapp)', extensions: ['authapp'] }],
    });

    if (saveDialogResult.canceled || !saveDialogResult.filePath) {
      return { success: false, filePath: null, exportedCount: 0 };
    }

    const accounts = this.accountService.list();
    const exportItems = await Promise.all(
      accounts.map(async (account) => {
        const { secret } = await this.accountService.getTotpSecret(account.id);
        return {
          issuer: account.issuer,
          accountName: account.accountName,
          secret,
          algorithm: account.algorithm,
          digits: account.digits,
          period: account.period,
          favorite: account.favorite,
          groupId: account.groupId,
        };
      }),
    );

    const payload = backupPayloadSchema.parse({
      version: 1,
      exportedAt: Date.now(),
      accounts: exportItems,
    });

    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const iterations = 100_000;
    const key = pbkdf2Sync(password, salt, iterations, 32, 'sha256');

    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const envelope = backupFileEnvelopeSchema.parse({
      format: 'authapp-backup-v1',
      kdf: {
        algorithm: 'pbkdf2',
        iterations,
        hash: 'sha256',
        salt: salt.toString('hex'),
      },
      cipher: {
        algorithm: 'aes-256-gcm',
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      },
      encryptedData: encrypted.toString('hex'),
    });

    fs.writeFileSync(saveDialogResult.filePath, JSON.stringify(envelope, null, 2), 'utf8');

    return {
      success: true,
      filePath: saveDialogResult.filePath,
      exportedCount: exportItems.length,
    };
  }

  async importBackup(password: string): Promise<ImportBackupResult> {
    const openDialogResult = await dialog.showOpenDialog({
      title: 'Yedek Dosyası Seç',
      filters: [{ name: 'Authapp Backup (*.authapp, *.json)', extensions: ['authapp', 'json'] }],
      properties: ['openFile'],
    });

    if (openDialogResult.canceled || !openDialogResult.filePaths[0]) {
      return { success: false, importedCount: 0, skippedCount: 0 };
    }

    const filePath = openDialogResult.filePaths[0];
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let envelopeRaw: unknown;
    try {
      envelopeRaw = JSON.parse(fileContent);
    } catch {
      throw new Error('Geçersiz yedek dosyası formatı.');
    }

    const envelope = backupFileEnvelopeSchema.parse(envelopeRaw);

    const salt = Buffer.from(envelope.kdf.salt, 'hex');
    const iv = Buffer.from(envelope.cipher.iv, 'hex');
    const authTag = Buffer.from(envelope.cipher.authTag, 'hex');
    const key = pbkdf2Sync(password, salt, envelope.kdf.iterations, 32, 'sha256');

    let decryptedText: string;
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(envelope.encryptedData, 'hex')),
        decipher.final(),
      ]);
      decryptedText = decrypted.toString('utf8');
    } catch {
      throw new Error('Parola hatalı veya yedek dosyası bozuk.');
    }

    let payloadRaw: unknown;
    try {
      payloadRaw = JSON.parse(decryptedText);
    } catch {
      throw new Error('Yedek verisi çözülemedi veya bozulmuş.');
    }

    const payload = backupPayloadSchema.parse(payloadRaw);

    let importedCount = 0;
    let skippedCount = 0;

    for (const item of payload.accounts) {
      try {
        await this.accountService.create({
          issuer: item.issuer,
          accountName: item.accountName,
          secret: item.secret,
          algorithm: item.algorithm,
          digits: item.digits,
          period: item.period,
          favorite: item.favorite,
          groupId: item.groupId,
        });
        importedCount++;
      } catch {
        skippedCount++;
      }
    }

    return {
      success: true,
      importedCount,
      skippedCount,
    };
  }
}
