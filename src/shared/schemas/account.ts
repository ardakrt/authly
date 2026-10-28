import { z } from 'zod';

export const totpAlgorithmSchema = z.enum(['SHA1', 'SHA256', 'SHA512']);

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const base32SecretSchema = z
  .string()
  .max(4096)
  .transform((value) => value.replace(/[\s-]/g, '').toUpperCase())
  .refine((value) => {
    if (!/^[A-Z2-7]{8,}={0,6}$/.test(value)) return false;
    const unpadded = value.replace(/=+$/, '');
    const remainder = unpadded.length % 8;
    if (![0, 2, 4, 5, 7].includes(remainder)) return false;
    if (value.includes('=') && value.length !== Math.ceil(unpadded.length / 8) * 8) {
      return false;
    }
    const unusedBits = (unpadded.length * 5) % 8;
    const last = BASE32_ALPHABET.indexOf(unpadded.at(-1)!);
    return (last & ((1 << unusedBits) - 1)) === 0;
  }, 'Geçerli bir Base32 kurulum anahtarı girin.')
  .transform((value) => value.replace(/=+$/, ''));

export const MAX_ACCOUNT_IMPORT_SIZE = 100;

export const accountDtoSchema = z.object({
  id: z.string().uuid(),
  issuer: z.string().min(1).max(120),
  accountName: z.string().min(1).max(240),
  algorithm: totpAlgorithmSchema,
  digits: z.number().int().min(6).max(10),
  period: z.number().int().min(5).max(300),
  favorite: z.boolean(),
  groupId: z.string().uuid().nullable(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

const accountFieldsSchema = z.object({
  issuer: z.string().trim().min(1).max(120),
  accountName: z.string().trim().min(1).max(240),
  secret: base32SecretSchema,
  algorithm: totpAlgorithmSchema.default('SHA1'),
  digits: z.number().int().min(6).max(10).default(6),
  period: z.number().int().min(5).max(300).default(30),
  favorite: z.boolean().default(false),
  groupId: z.string().uuid().nullable().default(null),
});

export const listAccountsRequestSchema = z.object({}).strict();
export const createAccountRequestSchema = accountFieldsSchema.strict();
export const importAccountsRequestSchema = z
  .object({ accounts: z.array(createAccountRequestSchema).min(1).max(MAX_ACCOUNT_IMPORT_SIZE) })
  .strict();
export const updateAccountRequestSchema = accountFieldsSchema
  .omit({ secret: true })
  .extend({ id: z.string().uuid(), secret: base32SecretSchema.optional() })
  .strict();
export const deleteAccountRequestSchema = z.object({ id: z.string().uuid() }).strict();

export type AccountDto = z.infer<typeof accountDtoSchema>;
export type CreateAccountRequest = z.infer<typeof createAccountRequestSchema>;
export type ImportAccountsRequest = z.infer<typeof importAccountsRequestSchema>;
export type UpdateAccountRequest = z.infer<typeof updateAccountRequestSchema>;
export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;
