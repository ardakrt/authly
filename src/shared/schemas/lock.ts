import { z } from 'zod';

export const lockStatusSchema = z
  .object({
    isPinSet: z.boolean(),
    isLocked: z.boolean(),
    autoLockTimeout: z.number().int().nonnegative(),
  })
  .strict();

export const setPinRequestSchema = z
  .object({
    pin: z
      .string()
      .min(4, 'PIN en az 4 haneli olmalıdır.')
      .max(12, 'PIN en fazla 12 haneli olmalıdır.'),
    currentPin: z.string().optional(),
  })
  .strict();

export const verifyPinRequestSchema = z
  .object({
    pin: z.string().min(1, 'Lütfen PIN girin.'),
  })
  .strict();

export const removePinRequestSchema = z
  .object({
    currentPin: z.string().min(1, 'Lütfen mevcut PIN girin.'),
  })
  .strict();

export type LockStatus = z.infer<typeof lockStatusSchema>;
export type SetPinRequest = z.infer<typeof setPinRequestSchema>;
export type VerifyPinRequest = z.infer<typeof verifyPinRequestSchema>;
export type RemovePinRequest = z.infer<typeof removePinRequestSchema>;
