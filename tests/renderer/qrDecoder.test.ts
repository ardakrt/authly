import { describe, expect, it, vi } from 'vitest';
import { processScannedQrContent } from '../../src/renderer/src/utils/qrDecoder';

describe('QR decoder utility', () => {
  it('parses raw secret keys correctly', async () => {
    const [res] = await processScannedQrContent('JBSWY3DPEHPK3PXP');
    expect(res?.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(res?.algorithm).toBe('SHA1');
    expect(res?.digits).toBe(6);
    expect(res?.period).toBe(30);
  });

  it('delegates otpauth URIs to window.authapp.parseOtpAuthUri', async () => {
    const mockParse = vi.fn().mockResolvedValue({
      issuer: 'Google',
      accountName: 'user@gmail.com',
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      favorite: false,
      groupId: null,
    });
    vi.stubGlobal('window', {
      authapp: {
        parseOtpAuthUri: mockParse,
      },
    });

    const [res] = await processScannedQrContent(
      'otpauth://totp/Google:user@gmail.com?secret=JBSWY3DPEHPK3PXP',
    );
    expect(mockParse).toHaveBeenCalledWith(
      'otpauth://totp/Google:user@gmail.com?secret=JBSWY3DPEHPK3PXP',
    );
    expect(res?.issuer).toBe('Google');
  });

  it('throws error for invalid content', async () => {
    await expect(processScannedQrContent('https://example.com/not-a-secret-890!')).rejects.toThrow(
      'QR kod geçerli bir Authenticator dışa aktarım QR kodu, hesap anahtarı veya otpauth bağlantısı içermiyor.',
    );
  });
});
