import { describe, expect, it } from 'vitest';
import { LockService } from '../../src/main/services/LockService';
import type { SettingsRepository } from '../../src/main/database/repositories/SettingsRepository';

describe('LockService', () => {
  it('starts unlocked when no PIN is set in repository', () => {
    const store = new Map<string, string>();
    const mockRepo = {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, val: string) => store.set(key, val),
      delete: (key: string) => store.delete(key),
    } as unknown as SettingsRepository;

    const service = new LockService(mockRepo);
    const status = service.getStatus();

    expect(status.isPinSet).toBe(false);
    expect(status.isLocked).toBe(false);
    expect(() => service.assertNotLocked()).not.toThrow();
  });

  it('sets a new PIN, locks the app, and verifies the correct PIN', () => {
    const store = new Map<string, string>();
    const mockRepo = {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, val: string) => store.set(key, val),
      delete: (key: string) => store.delete(key),
    } as unknown as SettingsRepository;

    const service = new LockService(mockRepo);
    service.setPin('1234');

    expect(store.has('pinHash')).toBe(true);
    expect(store.has('pinSalt')).toBe(true);
    service.lockApp();
    expect(service.getStatus().isLocked).toBe(true);
    expect(() => service.assertNotLocked()).toThrow('Uygulama kilitli');

    expect(() => service.verifyPin('9999')).toThrow('PIN hatalı');
    expect(service.verifyPin('1234')).toBe(true);
    expect(service.getStatus().isLocked).toBe(false);
    expect(() => service.assertNotLocked()).not.toThrow();
  });
});
