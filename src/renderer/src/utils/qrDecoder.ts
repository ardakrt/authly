import jsQR from 'jsQR';
import type { CreateAccountRequest } from '@shared/schemas/account';
import { parseOtpMigrationUri } from './otpMigrationParser';

export async function decodeQrFromImageData(imageData: ImageData): Promise<string | null> {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  return code ? code.data : null;
}

export async function decodeQrFromImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Görsel dosyası okunamadı.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Görsel formatı desteklenmiyor.'));
      img.onload = () => {
        try {
          const result = scanImageMultiPass(img);
          if (result) {
            resolve(result);
          } else {
            reject(
              new Error(
                'Görselde QR kod bulunamadı. Lütfen net bir QR kod görseli seçin veya ekran görüntüsünü kırpıp tekrar deneyin.',
              ),
            );
          }
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function scanImageMultiPass(img: HTMLImageElement): string | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // Multi-resolution scaling passes to handle high-density QR codes
  const targetSizes = [
    { w: origW, h: origH },
    { w: 1200, h: Math.round((1200 / (origW || 1)) * (origH || 1)) },
    { w: 800, h: Math.round((800 / (origW || 1)) * (origH || 1)) },
    { w: 600, h: Math.round((600 / (origW || 1)) * (origH || 1)) },
  ];

  for (const size of targetSizes) {
    if (size.w <= 0 || size.h <= 0) continue;
    canvas.width = size.w;
    canvas.height = size.h;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.drawImage(img, 0, 0, size.w, size.h);

    let imageData = ctx.getImageData(0, 0, size.w, size.h);

    // Pass 1: Raw decode with attemptBoth
    let code = jsQR(imageData.data, size.w, size.h, { inversionAttempts: 'attemptBoth' });
    if (code?.data) return code.data;

    // Pass 2: Standard Binarization (Threshold 128)
    binarizeImageData(imageData, 128);
    code = jsQR(imageData.data, size.w, size.h, { inversionAttempts: 'attemptBoth' });
    if (code?.data) return code.data;

    // Pass 3: High Contrast Threshold (160)
    imageData = ctx.getImageData(0, 0, size.w, size.h);
    binarizeImageData(imageData, 160);
    code = jsQR(imageData.data, size.w, size.h, { inversionAttempts: 'attemptBoth' });
    if (code?.data) return code.data;

    // Pass 4: Low Contrast Threshold (96)
    imageData = ctx.getImageData(0, 0, size.w, size.h);
    binarizeImageData(imageData, 96);
    code = jsQR(imageData.data, size.w, size.h, { inversionAttempts: 'attemptBoth' });
    if (code?.data) return code.data;
  }

  // Pass 5: Crop outer margins if screenshot contains surrounding frame/border
  if (origW > 100 && origH > 100) {
    const marginW = Math.round(origW * 0.04);
    const marginH = Math.round(origH * 0.04);
    const cropW = origW - marginW * 2;
    const cropH = origH - marginH * 2;
    canvas.width = cropW;
    canvas.height = cropH;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, marginW, marginH, cropW, cropH, 0, 0, cropW, cropH);

    const croppedData = ctx.getImageData(0, 0, cropW, cropH);
    let code = jsQR(croppedData.data, cropW, cropH, { inversionAttempts: 'attemptBoth' });
    if (code?.data) return code.data;

    binarizeImageData(croppedData, 128);
    code = jsQR(croppedData.data, cropW, cropH, { inversionAttempts: 'attemptBoth' });
    if (code?.data) return code.data;
  }

  return null;
}

function binarizeImageData(imageData: ImageData, threshold: number): void {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] ?? 0;
    const g = d[i + 1] ?? 0;
    const b = d[i + 2] ?? 0;
    const gray = (r * 299 + g * 587 + b * 114) / 1000;
    const v = gray >= threshold ? 255 : 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
}

export async function processScannedQrContent(content: string): Promise<CreateAccountRequest[]> {
  const trimmed = content.trim();

  // 1. Google Authenticator Migration / Export QR format (contains 1 or multiple accounts)
  if (trimmed.startsWith('otpauth-migration://')) {
    return parseOtpMigrationUri(trimmed);
  }

  // 2. Single standard otpauth:// URI
  if (trimmed.startsWith('otpauth://')) {
    const parsed = await window.authapp.parseOtpAuthUri(trimmed);
    return [parsed];
  }

  // 3. Raw secret key case (e.g. JBSWY3DPEHPK3PXP)
  const cleanSecret = trimmed.replace(/\s+/g, '').toUpperCase();
  if (/^[A-Z2-7=]{8,}$/.test(cleanSecret)) {
    return [
      {
        issuer: 'Yeni Servis',
        accountName: 'Hesabım',
        secret: cleanSecret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        favorite: false,
        groupId: null,
      },
    ];
  }

  throw new Error(
    'QR kod geçerli bir Authenticator dışa aktarım QR kodu, hesap anahtarı veya otpauth bağlantısı içermiyor.',
  );
}
