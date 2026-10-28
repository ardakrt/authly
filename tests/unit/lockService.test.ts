import { describe, expect, it } from 'vitest';
import { LockService } from '../../src/main/services/LockService';
import type { SettingsRepository } from '../../src/main/database/repositories/SettingsRepository';

describe('LockService', () => {
  function fixture() {
    const store = new Map<string, string>();
    const repository = {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => store.set(key, value),
      delete: (key: string) => store.delete(key),
    } as unknown as SettingsRepository;
    let now = 1000;
    let systemIdle = 0;
    const service = new LockService(
      repository,
      () => now,
      () => systemIdle,
    );
    return {
      service,
      store,
      advance: (ms: number) => {
        now += ms;
      },
      idle: (seconds: number) => {
        systemIdle = seconds;
      },
    };
  }

  it('enforces inactivity in main and reports a single lock transition', () => {
    const f = fixture();
    f.service.setPin('1234');
    const changes: boolean[] = [];
    f.service.onStatusChange((status) => changes.push(status.isLocked));
    f.advance(299_999);
    expect(f.service.getStatus().isLocked).toBe(false);
    f.advance(1);
    f.service.checkAutoLock();
    f.service.checkAutoLock();
    expect(changes).toEqual([true]);
    expect(() => f.service.assertNotLocked()).toThrow();
  });

  it('extends a live session on activity, but never unlocks an expired session with activity', () => {
    const f = fixture();
    f.service.setPin('1234');
    f.advance(240_000);
    f.service.recordActivity();
    f.advance(240_000);
    expect(f.service.getStatus().isLocked).toBe(false);
    f.advance(60_000);
    expect(() => f.service.recordActivity()).toThrow();
    expect(f.service.getStatus().isLocked).toBe(true);
  });

  it('rejects pending work even if the user has unlocked again', () => {
    const f = fixture();
    f.service.setPin('1234');
    const guard = f.service.captureSession();
    f.service.lockApp();
    f.service.verifyPin('1234');
    expect(() => guard()).toThrow('oturumu değişti');
    expect(() => f.service.captureSession()()).not.toThrow();
  });

  it('uses OS idle time so synthetic renderer activity cannot keep an idle machine unlocked', () => {
    const f = fixture();
    f.service.setPin('1234');
    f.idle(300);
    expect(() => f.service.recordActivity()).toThrow();
    expect(f.service.getStatus().isLocked).toBe(true);
  });

  it('honors disabled inactivity locking and leaves accounts without a PIN available', () => {
    const f = fixture();
    f.advance(600_000);
    expect(f.service.getStatus().isLocked).toBe(false);
    f.service.setPin('1234');
    f.store.set('autoLockTimeout', '0');
    f.advance(600_000);
    expect(f.service.getStatus().isLocked).toBe(false);
  });

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
    expect(store.get('pinIterations')).toBe('600000');
    service.lockApp();
    expect(service.getStatus().isLocked).toBe(true);
    expect(() => service.assertNotLocked()).toThrow('Uygulama kilitli');

    expect(() => service.verifyPin('9999')).toThrow('PIN hatalı');
    expect(service.verifyPin('1234')).toBe(true);
    expect(service.getStatus().isLocked).toBe(false);
    expect(() => service.assertNotLocked()).not.toThrow();
  });

  it('persists failed attempts and rate-limits PIN verification', () => {
    const store = new Map<string, string>();
    const mockRepo = {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, val: string) => store.set(key, val),
      delete: (key: string) => store.delete(key),
    } as unknown as SettingsRepository;
    let now = 1_000;

    const service = new LockService(mockRepo, () => now);
    service.setPin('1234');
    service.lockApp();

    for (let attempt = 1; attempt < 5; attempt++) {
      expect(() => service.verifyPin('9999')).toThrow('PIN hatalı');
    }
    expect(() => service.verifyPin('9999')).toThrow('Çok fazla hatalı deneme');
    expect(store.get('pinFailedAttempts')).toBe('5');
    expect(Number(store.get('pinLockoutUntil'))).toBeGreaterThan(now);
    expect(() => service.verifyPin('1234')).toThrow('Çok fazla hatalı deneme');

    now += 30_001;
    expect(service.verifyPin('1234')).toBe(true);
    expect(store.has('pinFailedAttempts')).toBe(false);
    expect(store.has('pinLockoutUntil')).toBe(false);
  });
});
