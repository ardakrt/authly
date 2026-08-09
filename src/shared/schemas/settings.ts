import { z } from 'zod';

export const themePreferenceSchema = z.enum(['system', 'light', 'dark']);
export const languagePreferenceSchema = z.enum(['tr', 'en']);

export const appSettingsSchema = z
  .object({
    theme: themePreferenceSchema,
    language: languagePreferenceSchema,
    closeToTray: z.boolean(),
    startMinimized: z.boolean(),
  })
  .strict();

export const getSettingsRequestSchema = z.object({}).strict();

export const updateSettingsRequestSchema = z
  .object({
    theme: themePreferenceSchema.optional(),
    language: languagePreferenceSchema.optional(),
    closeToTray: z.boolean().optional(),
    startMinimized: z.boolean().optional(),
  })
  .strict();

export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type LanguagePreference = z.infer<typeof languagePreferenceSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type UpdateSettingsRequest = z.infer<typeof updateSettingsRequestSchema>;
