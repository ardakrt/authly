import { describe, expect, it } from 'vitest';
import { parseOtpMigrationUri } from '../../src/renderer/src/utils/otpMigrationParser';

describe('Google Authenticator migration URI parser', () => {
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
