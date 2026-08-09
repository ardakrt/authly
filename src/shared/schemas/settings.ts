import { z } from 'zod';

export const themePreferenceSchema = z.enum(['system', 'light', 'dark']);

export const appSettingsSchema = z
  .object({
    theme: themePreferenceSchema,
    closeToTray: z.boolean(),
    startMinimized: z.boolean(),
  })
  .strict();

export const getSettingsRequestSchema = z.object({}).strict();

export const updateSettingsRequestSchema = z
  .object({
    theme: themePreferenceSchema.optional(),
    closeToTray: z.boolean().optional(),
    startMinimized: z.boolean().optional(),
  })
  .strict();

export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type UpdateSettingsRequest = z.infer<typeof updateSettingsRequestSchema>;
