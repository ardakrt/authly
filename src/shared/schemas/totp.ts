import { z } from 'zod';
import { createAccountRequestSchema } from './account';

export const totpCodeSchema = z.object({
  accountId: z.string().uuid(),
  code: z.string().regex(/^\d{6,10}$/),
  remaining: z.number().int().positive(),
  period: z.number().int().positive(),
});
export const getTotpCodesRequestSchema = z.object({}).strict();
export const parseOtpAuthUriRequestSchema = z.object({ uri: z.string().trim().max(8192) }).strict();
export const copyTotpRequestSchema = z.object({ accountId: z.string().uuid() }).strict();
export const parsedOtpAuthSchema = createAccountRequestSchema;

export type TotpCode = z.infer<typeof totpCodeSchema>;
export type ParsedOtpAuth = z.infer<typeof parsedOtpAuthSchema>;
