import { describe, expect, it } from 'vitest';
import { TotpService } from '../../src/main/services/TotpService';

describe('TotpService', () => {
  const service = new TotpService();

  it.each([
    ['SHA1', 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '94287082'],
    ['SHA256', 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA', '46119246'],
    [
      'SHA512',
      'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA',
      '90693936',
    ],
  ] as const)('matches the RFC 6238 vector for %s', (algorithm, secret, expected) => {
    expect(service.generate(secret, algorithm, 8, 30, 59_000).code).toBe(expected);
  });

  it('parses a standard otpauth TOTP URI', () => {
    expect(
      service.parseUri(
        'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example',
      ),
    ).toMatchObject({
      issuer: 'Example',
      accountName: 'alice@example.com',
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
  });
});
