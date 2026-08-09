import { z } from 'zod';

export const runtimeInfoRequestSchema = z.object({}).strict();

export const runtimeInfoSchema = z
  .object({
    appName: z.string().min(1).max(80),
    appVersion: z.string().min(1).max(40),
    platform: z.string().min(1).max(32),
    packaged: z.boolean(),
  })
  .strict();

export type RuntimeInfo = z.infer<typeof runtimeInfoSchema>;
