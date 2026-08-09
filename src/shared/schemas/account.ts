import { z } from 'zod';

export const totpAlgorithmSchema = z.enum(['SHA1', 'SHA256', 'SHA512']);

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
  secret: z.string().trim().min(8).max(4096),
  algorithm: totpAlgorithmSchema.default('SHA1'),
  digits: z.number().int().min(6).max(10).default(6),
  period: z.number().int().min(5).max(300).default(30),
  favorite: z.boolean().default(false),
  groupId: z.string().uuid().nullable().default(null),
});

export const listAccountsRequestSchema = z.object({}).strict();
export const createAccountRequestSchema = accountFieldsSchema.strict();
export const updateAccountRequestSchema = accountFieldsSchema
  .omit({ secret: true })
  .extend({ id: z.string().uuid(), secret: z.string().trim().min(8).max(4096).optional() })
  .strict();
export const deleteAccountRequestSchema = z.object({ id: z.string().uuid() }).strict();

export type AccountDto = z.infer<typeof accountDtoSchema>;
export type CreateAccountRequest = z.infer<typeof createAccountRequestSchema>;
export type UpdateAccountRequest = z.infer<typeof updateAccountRequestSchema>;
export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;
