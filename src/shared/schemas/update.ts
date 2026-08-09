import { z } from 'zod';

export const checkUpdateRequestSchema = z.object({}).strict();
export type CheckUpdateRequest = z.infer<typeof checkUpdateRequestSchema>;

export const getUpdateStateRequestSchema = z.object({}).strict();
export const installUpdateRequestSchema = z.object({}).strict();

export const updatePhaseSchema = z.enum([
  'idle',
  'checking',
  'available',
  'downloading',
  'downloaded',
  'error',
]);

export const updateStateSchema = z
  .object({
    phase: updatePhaseSchema,
    currentVersion: z.string().min(1).max(40),
    latestVersion: z.string().min(1).max(40).optional(),
    progress: z.number().min(0).max(100).optional(),
    bytesPerSecond: z.number().nonnegative().optional(),
    error: z.string().max(500).optional(),
  })
  .strict();
export type UpdateState = z.infer<typeof updateStateSchema>;

export const updateInfoSchema = z.object({
  hasUpdate: z.boolean(),
  currentVersion: z.string(),
  latestVersion: z.string(),
  releaseUrl: z.string().optional(),
  releaseNotes: z.string().optional(),
  publishedAt: z.string().optional(),
  error: z.string().optional(),
});
export type UpdateInfo = z.infer<typeof updateInfoSchema>;
