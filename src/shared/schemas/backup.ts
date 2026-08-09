import { z } from 'zod';
import { totpAlgorithmSchema } from './account';

export const exportBackupRequestSchema = z
  .object({
    password: z.string().min(4, 'Parola en az 4 karakter olmalıdır.').max(128),
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
    accounts: z.array(backupAccountItemSchema),
  })
  .strict();

export const backupFileEnvelopeSchema = z
  .object({
    format: z.literal('authapp-backup-v1'),
    kdf: z
      .object({
        algorithm: z.literal('pbkdf2'),
        iterations: z.number().int().positive(),
        hash: z.literal('sha256'),
        salt: z.string().regex(/^[0-9a-fA-F]+$/),
      })
      .strict(),
    cipher: z
      .object({
        algorithm: z.literal('aes-256-gcm'),
        iv: z.string().regex(/^[0-9a-fA-F]+$/),
        authTag: z.string().regex(/^[0-9a-fA-F]+$/),
      })
      .strict(),
    encryptedData: z.string().regex(/^[0-9a-fA-F]+$/),
  })
  .strict();

export type ExportBackupRequest = z.infer<typeof exportBackupRequestSchema>;
export type ExportBackupResult = z.infer<typeof exportBackupResultSchema>;
export type ImportBackupRequest = z.infer<typeof importBackupRequestSchema>;
export type ImportBackupResult = z.infer<typeof importBackupResultSchema>;
export type BackupPayload = z.infer<typeof backupPayloadSchema>;
export type BackupFileEnvelope = z.infer<typeof backupFileEnvelopeSchema>;
