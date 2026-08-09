import * as OTPAuth from 'otpauth';
import type { CreateAccountRequest } from '@shared/schemas/account';
import { createAccountRequestSchema } from '@shared/schemas/account';

export interface TotpValue {
  code: string;
  remaining: number;
  period: number;
}

export class TotpService {
  generate(
    secret: string,
    algorithm: CreateAccountRequest['algorithm'],
    digits: number,
    period: number,
    timestamp = Date.now(),
  ): TotpValue {
    const normalized = secret.replace(/[\s-]/g, '').toUpperCase();
    const otpSecret = OTPAuth.Secret.fromBase32(normalized);
    return {
      code: OTPAuth.TOTP.generate({ secret: otpSecret, algorithm, digits, period, timestamp }),
      remaining: Math.max(1, Math.ceil(OTPAuth.TOTP.remaining({ period, timestamp }) / 1000)),
      period,
    };
  }

  parseUri(uri: string): CreateAccountRequest {
    const parsed = OTPAuth.URI.parse(uri);
    if (!(parsed instanceof OTPAuth.TOTP)) throw new Error('Only TOTP URIs are supported.');
    return createAccountRequestSchema.parse({
      issuer: parsed.issuer || 'Authenticator',
      accountName: parsed.label,
      secret: parsed.secret.base32,
      algorithm: parsed.algorithm.toUpperCase(),
      digits: parsed.digits,
      period: parsed.period,
      favorite: false,
      groupId: null,
    });
  }
}
