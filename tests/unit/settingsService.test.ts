import { describe, expect, it, vi } from 'vitest';
import { SettingsService } from '../../src/main/services/SettingsService';
import type { SettingsRepository } from '../../src/main/database/repositories/SettingsRepository';

describe('SettingsService', () => {
  it('returns default settings when repository is empty', () => {
    const mockRepo = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    } as unknown as SettingsRepository;

    const service = new SettingsService(mockRepo);
    const settings = service.getSettings();

    expect(settings).toEqual({
      theme: 'system',
      closeToTray: true,
      startMinimized: false,
    });
  });

  it('updates settings and persists them to repository', () => {
    const store = new Map<string, string>();
    const mockRepo = {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, val: string) => store.set(key, val),
    } as unknown as SettingsRepository;

    const service = new SettingsService(mockRepo);
    const updated = service.updateSettings({ closeToTray: false, theme: 'dark' });

    expect(updated).toEqual({
      theme: 'dark',
      closeToTray: false,
      startMinimized: false,
    });
    expect(store.get('closeToTray')).toBe('false');
    expect(store.get('theme')).toBe('dark');
  });
});
