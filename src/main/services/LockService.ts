import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import type { SettingsRepository } from '../database/repositories/SettingsRepository';
import type { LockStatus } from '@shared/schemas/lock';
import { lockStatusSchema } from '@shared/schemas/lock';

const CURRENT_PIN_ITERATIONS = 600_000;
const LEGACY_PIN_ITERATIONS = 100_000;
const MAX_FAILED_ATTEMPTS_BEFORE_DELAY = 5;
const BASE_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 15 * 60_000;

export class LockService {
  private isLocked: boolean;

  constructor(
    private readonly repository: SettingsRepository,
    private readonly now: () => number = Date.now,
  ) {
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

    const now = this.now();
    const lockoutUntil = Number.parseInt(this.repository.get('pinLockoutUntil') ?? '0', 10) || 0;
    if (lockoutUntil > now) {
      const remainingSeconds = Math.max(1, Math.ceil((lockoutUntil - now) / 1000));
      throw new Error(`Çok fazla hatalı deneme. ${remainingSeconds} saniye sonra tekrar deneyin.`);
    }

    if (lockoutUntil > 0) this.repository.delete('pinLockoutUntil');

    const iterations =
      Number.parseInt(this.repository.get('pinIterations') ?? String(LEGACY_PIN_ITERATIONS), 10) ||
      LEGACY_PIN_ITERATIONS;
    const salt = Buffer.from(pinSalt, 'hex');
    const expectedHash = Buffer.from(pinHash, 'hex');
    const derivedHash = pbkdf2Sync(pin, salt, iterations, 32, 'sha256');

    if (derivedHash.length !== expectedHash.length || !timingSafeEqual(derivedHash, expectedHash)) {
      const failedAttempts =
        (Number.parseInt(this.repository.get('pinFailedAttempts') ?? '0', 10) || 0) + 1;
      this.repository.set('pinFailedAttempts', String(failedAttempts));

      if (failedAttempts >= MAX_FAILED_ATTEMPTS_BEFORE_DELAY) {
        const delayLevel = Math.floor(
          (failedAttempts - MAX_FAILED_ATTEMPTS_BEFORE_DELAY) / MAX_FAILED_ATTEMPTS_BEFORE_DELAY,
        );
        const lockoutMs = Math.min(BASE_LOCKOUT_MS * 2 ** delayLevel, MAX_LOCKOUT_MS);
        this.repository.set('pinLockoutUntil', String(now + lockoutMs));
        throw new Error(`Çok fazla hatalı deneme. ${Math.ceil(lockoutMs / 1000)} saniye bekleyin.`);
      }

      throw new Error('PIN hatalı.');
    }

    this.clearFailedAttempts();
    if (iterations < CURRENT_PIN_ITERATIONS) this.storePin(pin);
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

    this.storePin(pin);
    this.clearFailedAttempts();
    this.isLocked = false;
  }

  removePin(currentPin: string): void {
    this.verifyPin(currentPin);
    this.repository.delete('pinHash');
    this.repository.delete('pinSalt');
    this.repository.delete('pinIterations');
    this.clearFailedAttempts();
    this.isLocked = false;
  }

  lockApp(): void {
    if (this.repository.get('pinHash')) {
      this.isLocked = true;
    }
  }

  private storePin(pin: string): void {
    const salt = randomBytes(16);
    const hash = pbkdf2Sync(pin, salt, CURRENT_PIN_ITERATIONS, 32, 'sha256');
    this.repository.set('pinSalt', salt.toString('hex'));
    this.repository.set('pinHash', hash.toString('hex'));
    this.repository.set('pinIterations', String(CURRENT_PIN_ITERATIONS));
  }

  private clearFailedAttempts(): void {
    this.repository.delete('pinFailedAttempts');
    this.repository.delete('pinLockoutUntil');
  }
}
