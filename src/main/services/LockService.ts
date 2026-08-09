import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import type { SettingsRepository } from '../database/repositories/SettingsRepository';
import type { LockStatus } from '@shared/schemas/lock';
import { lockStatusSchema } from '@shared/schemas/lock';

export class LockService {
  private isLocked: boolean;

  constructor(private readonly repository: SettingsRepository) {
    const hasPin = Boolean(this.repository.get('pinHash'));
    this.isLocked = hasPin;
  }

  getStatus(): LockStatus {
    const pinHash = this.repository.get('pinHash');
    const timeoutRaw = this.repository.get('autoLockTimeout') ?? '5';
    const autoLockTimeout = parseInt(timeoutRaw, 10) || 5;

    return lockStatusSchema.parse({
      isPinSet: Boolean(pinHash),
      isLocked: this.isLocked && Boolean(pinHash),
      autoLockTimeout,
    });
  }

  assertNotLocked(): void {
    if (this.getStatus().isLocked) {
      throw new Error('Uygulama kilitli. Lütfen PIN girin.');
    }
  }

  verifyPin(pin: string): boolean {
    const pinHash = this.repository.get('pinHash');
    const pinSalt = this.repository.get('pinSalt');

    if (!pinHash || !pinSalt) {
      throw new Error('PIN oluşturulmamış.');
    }

    const salt = Buffer.from(pinSalt, 'hex');
    const expectedHash = Buffer.from(pinHash, 'hex');
    const derivedHash = pbkdf2Sync(pin, salt, 100_000, 32, 'sha256');

    if (derivedHash.length !== expectedHash.length || !timingSafeEqual(derivedHash, expectedHash)) {
      throw new Error('PIN hatalı.');
    }

    this.isLocked = false;
    return true;
  }

  setPin(pin: string, currentPin?: string): void {
    const existingHash = this.repository.get('pinHash');
    if (existingHash) {
      if (!currentPin) {
        throw new Error('Mevcut PIN zorunludur.');
      }
      this.verifyPin(currentPin);
    }

    const salt = randomBytes(16);
    const hash = pbkdf2Sync(pin, salt, 100_000, 32, 'sha256');

    this.repository.set('pinSalt', salt.toString('hex'));
    this.repository.set('pinHash', hash.toString('hex'));
    this.isLocked = false;
  }

  removePin(currentPin: string): void {
    this.verifyPin(currentPin);
    this.repository.delete('pinHash');
    this.repository.delete('pinSalt');
    this.isLocked = false;
  }

  lockApp(): void {
    if (this.repository.get('pinHash')) {
      this.isLocked = true;
    }
  }
}
