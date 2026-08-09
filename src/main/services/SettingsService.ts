import type { SettingsRepository } from '../database/repositories/SettingsRepository';
import type { AppSettings, UpdateSettingsRequest } from '@shared/schemas/settings';
import { appSettingsSchema } from '@shared/schemas/settings';

export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  getSettings(): AppSettings {
    const themeRaw = this.repository.get('theme') ?? 'system';
    const closeToTrayRaw = this.repository.get('closeToTray') ?? 'true';
    const startMinimizedRaw = this.repository.get('startMinimized') ?? 'false';

    const theme =
      themeRaw === 'light' || themeRaw === 'dark' || themeRaw === 'system' ? themeRaw : 'system';
    const closeToTray = closeToTrayRaw !== 'false';
    const startMinimized = startMinimizedRaw === 'true';

    return appSettingsSchema.parse({
      theme,
      closeToTray,
      startMinimized,
    });
  }

  updateSettings(input: UpdateSettingsRequest): AppSettings {
    if (input.theme !== undefined) {
      this.repository.set('theme', input.theme);
    }
    if (input.closeToTray !== undefined) {
      this.repository.set('closeToTray', String(input.closeToTray));
    }
    if (input.startMinimized !== undefined) {
      this.repository.set('startMinimized', String(input.startMinimized));
    }
    return this.getSettings();
  }
}
