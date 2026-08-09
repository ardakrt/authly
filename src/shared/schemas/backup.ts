import { z } from 'zod';
import { totpAlgorithmSchema } from './account';

export const MIN_BACKUP_PASSWORD_LENGTH = 12;
export const MIN_BACKUP_KDF_ITERATIONS = 100_000;
export const CURRENT_BACKUP_KDF_ITERATIONS = 600_000;
export const MAX_BACKUP_KDF_ITERATIONS = 2_000_000;
export const MAX_BACKUP_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_BACKUP_ACCOUNTS = 10_000;

export const exportBackupRequestSchema = z
  .object({
    password: z
      .string()
      .min(
        MIN_BACKUP_PASSWORD_LENGTH,
        `Parola en az ${MIN_BACKUP_PASSWORD_LENGTH} karakter olmalıdır.`,
      )
      .max(128),
  })
  .strict();

export const exportBackupResultSchema = z
  .object({
    success: z.boolean(),
    filePath: z.string().nullable(),
    exportedCount: z.number().int().nonnegative(),
  })
  .strict();

export const importBackupRequestSchema = z
  .object({
    password: z.string().min(1, 'Lütfen parolanızı girin.').max(128),
  })
  .strict();

export const importBackupResultSchema = z
  .object({
    success: z.boolean(),
    importedCount: z.number().int().nonnegative(),
    skippedCount: z.number().int().nonnegative(),
  })
  .strict();

export const backupAccountItemSchema = z.object({
  issuer: z.string().min(1).max(120),
  accountName: z.string().min(1).max(240),
  secret: z.string().min(8).max(4096),
  algorithm: totpAlgorithmSchema.default('SHA1'),
  digits: z.number().int().min(6).max(10).default(6),
  period: z.number().int().min(5).max(300).default(30),
  favorite: z.boolean().default(false),
  groupId: z.string().uuid().nullable().default(null),
});

export const backupPayloadSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.number().int().positive(),
    accounts: z.array(backupAccountItemSchema).max(MAX_BACKUP_ACCOUNTS),
  })
  .strict();

export const backupFileEnvelopeSchema = z
  .object({
    format: z.literal('authapp-backup-v1'),
    kdf: z
      .object({
        algorithm: z.literal('pbkdf2'),
        iterations: z.number().int().min(MIN_BACKUP_KDF_ITERATIONS).max(MAX_BACKUP_KDF_ITERATIONS),
        hash: z.literal('sha256'),
        salt: z.string().regex(/^[0-9a-fA-F]{32}$/),
      })
      .strict(),
    cipher: z
      .object({
        algorithm: z.literal('aes-256-gcm'),
        iv: z.string().regex(/^[0-9a-fA-F]{24}$/),
        authTag: z.string().regex(/^[0-9a-fA-F]{32}$/),
      })
      .strict(),
    encryptedData: z
      .string()
      .min(2)
      .max(MAX_BACKUP_FILE_BYTES * 2)
      .regex(/^[0-9a-fA-F]+$/),
  })
  .strict();

export type ExportBackupRequest = z.infer<typeof exportBackupRequestSchema>;
export type ExportBackupResult = z.infer<typeof exportBackupResultSchema>;
export type ImportBackupRequest = z.infer<typeof importBackupRequestSchema>;
export type ImportBackupResult = z.infer<typeof importBackupResultSchema>;
export type BackupPayload = z.infer<typeof backupPayloadSchema>;
export type BackupFileEnvelope = z.infer<typeof backupFileEnvelopeSchema>;
