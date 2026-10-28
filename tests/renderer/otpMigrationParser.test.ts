import { describe, expect, it } from 'vitest';
import { parseOtpMigrationUri } from '../../src/renderer/src/utils/otpMigrationParser';

function migrationUri(payload: number[]): string {
  return `otpauth-migration://offline?data=${encodeURIComponent(btoa(String.fromCharCode(...payload)))}`;
}

function accountMessage(type = 2, algorithm = 1, digits = 1): number[] {
  const account = [
    10,
    10,
    ...Array<number>(10).fill(65),
    18,
    7,
    ...Array.from('fixture', (char) => char.charCodeAt(0)),
    32,
    algorithm,
    40,
    digits,
    48,
    type,
  ];
  return [10, account.length, ...account];
}

describe('Google Authenticator migration URI parser', () => {
  it('imports multiple TOTP accounts with the original algorithms and digit counts', () => {
    const accounts = parseOtpMigrationUri(
      migrationUri([...accountMessage(), ...accountMessage(2, 3, 2)]),
    );
    expect(accounts).toHaveLength(2);
    expect(accounts[0]).toMatchObject({
      accountName: 'fixture',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    expect(accounts[1]).toMatchObject({ algorithm: 'SHA512', digits: 8 });
  });

  it.each([0, 1, 3])('rejects unsupported OTP type %s instead of generating TOTP', (type) => {
    expect(() => parseOtpMigrationUri(migrationUri(accountMessage(type)))).toThrow('TOTP');
  });

  it('rejects mixed HOTP/TOTP imports as a whole', () => {
    expect(() =>
      parseOtpMigrationUri(migrationUri([...accountMessage(), ...accountMessage(1)])),
    ).toThrow('TOTP');
  });

  it('skips well-formed integer metadata without overflowing uint32 length parsing', () => {
    const batchId = [40, ...Array<number>(9).fill(255), 1];
    expect(parseOtpMigrationUri(migrationUri([...accountMessage(), ...batchId]))).toHaveLength(1);
  });

  it.each([
    [10, 250, 255, 255, 255, 15], // Former negative length / infinite loop.
    [10, 255, 255, 255, 255, 31], // uint32 overflow.
    [10, 128], // Truncated varint.
    [10, 9, 1], // Truncated submessage.
    [0], // Invalid tag.
    [15], // Invalid wire type.
    [17], // Truncated fixed64.
    [10, 2, 10, 9], // Truncated nested byte field.
  ])('rejects malformed protobuf fixture %#', (...bytes) => {
    expect(() => parseOtpMigrationUri(migrationUri(bytes))).toThrow();
  });

  it('rejects unknown algorithms, digits and oversized inputs', () => {
    expect(() => parseOtpMigrationUri(migrationUri(accountMessage(2, 4)))).toThrow();
    expect(() => parseOtpMigrationUri(migrationUri(accountMessage(2, 1, 3)))).toThrow();
    expect(() => parseOtpMigrationUri('x'.repeat(128 * 1024 + 1))).toThrow();
    expect(() =>
      parseOtpMigrationUri(
        migrationUri(Array.from({ length: 101 }, () => accountMessage()).flat()),
      ),
    ).toThrow();
  });

  it('throws an error for non-migration URIs', () => {
    expect(() => parseOtpMigrationUri('https://example.com')).toThrowError(
      'Geçersiz Google Authenticator dışa aktarım URL formatı.',
    );
  });

  it('throws an error if data parameter is missing', () => {
    expect(() => parseOtpMigrationUri('otpauth-migration://offline')).toThrowError(
      'QR kodunda veri parametresi bulunamadı.',
    );
  });
});
