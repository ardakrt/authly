import { z } from 'zod';

export const checkUpdateRequestSchema = z.object({}).strict();
export type CheckUpdateRequest = z.infer<typeof checkUpdateRequestSchema>;

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

export const openExternalUrlRequestSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), {
      message: 'Yalnızca https bağlantıları açılabilir.',
    }),
});
export type OpenExternalUrlRequest = z.infer<typeof openExternalUrlRequestSchema>;
