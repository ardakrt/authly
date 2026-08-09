import type { CreateAccountRequest } from '@shared/schemas/account';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function bytesToBase32(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]!;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function parseOtpMigrationUri(uriString: string): CreateAccountRequest[] {
  const url = new URL(uriString);
  if (url.protocol !== 'otpauth-migration:') {
    throw new Error('Geçersiz Google Authenticator dışa aktarım URL formatı.');
  }

  const dataParam = url.searchParams.get('data');
  if (!dataParam) {
    throw new Error('QR kodunda veri parametresi bulunamadı.');
  }

  // URL-safe base64 string handling
  const base64Standard = dataParam.replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = atob(base64Standard);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Parse protobuf payload
  const accounts: CreateAccountRequest[] = [];
  let pos = 0;

  const readVarint = (): number | null => {
    let result = 0;
    let shift = 0;
    while (pos < bytes.length) {
      const byte = bytes[pos++]!;
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return result;
      shift += 7;
      if (shift >= 35) break;
    }
    return null;
  };

  const skipField = (wireType: number): void => {
    if (wireType === 0) {
      readVarint();
    } else if (wireType === 2) {
      const len = readVarint();
      if (len !== null) pos += len;
    } else if (wireType === 1) {
      pos += 8;
    } else if (wireType === 5) {
      pos += 4;
    }
  };

  while (pos < bytes.length) {
    const tag = readVarint();
    if (tag === null) break;
    const fieldNum = tag >> 3;
    const wireType = tag & 0x07;

    if (fieldNum === 1 && wireType === 2) {
      // OtpParameters submessage
      const len = readVarint();
      if (len === null) break;
      const subBytes = bytes.subarray(pos, pos + len);
      pos += len;

      const account = parseOtpParameters(subBytes);
      if (account) accounts.push(account);
    } else {
      skipField(wireType);
    }
  }

  if (accounts.length === 0) {
    throw new Error('QR kodunda aktarılabilecek hesap verisi bulunamadı.');
  }

  return accounts;
}

function parseOtpParameters(bytes: Uint8Array): CreateAccountRequest | null {
  let secretBytes: Uint8Array | null = null;
  let name = '';
  let issuer = '';
  let algorithm: CreateAccountRequest['algorithm'] = 'SHA1';
  let digits = 6;
  const period = 30;

  let pos = 0;

  const readVarint = (): number | null => {
    let result = 0;
    let shift = 0;
    while (pos < bytes.length) {
      const byte = bytes[pos++]!;
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return result;
      shift += 7;
      if (shift >= 35) break;
    }
    return null;
  };

  const skipField = (wireType: number): void => {
    if (wireType === 0) {
      readVarint();
    } else if (wireType === 2) {
      const len = readVarint();
      if (len !== null) pos += len;
    } else if (wireType === 1) {
      pos += 8;
    } else if (wireType === 5) {
      pos += 4;
    }
  };

  while (pos < bytes.length) {
    const tag = readVarint();
    if (tag === null) break;
    const fieldNum = tag >> 3;
    const wireType = tag & 0x07;

    if (fieldNum === 1 && wireType === 2) {
      const len = readVarint();
      if (len !== null) {
        secretBytes = bytes.subarray(pos, pos + len);
        pos += len;
      }
    } else if (fieldNum === 2 && wireType === 2) {
      const len = readVarint();
      if (len !== null) {
        name = new TextDecoder().decode(bytes.subarray(pos, pos + len));
        pos += len;
      }
    } else if (fieldNum === 3 && wireType === 2) {
      const len = readVarint();
      if (len !== null) {
        issuer = new TextDecoder().decode(bytes.subarray(pos, pos + len));
        pos += len;
      }
    } else if (fieldNum === 4 && wireType === 0) {
      const algoVal = readVarint();
      if (algoVal === 2) algorithm = 'SHA256';
      else if (algoVal === 3) algorithm = 'SHA512';
      else algorithm = 'SHA1';
    } else if (fieldNum === 5 && wireType === 0) {
      const digitVal = readVarint();
      if (digitVal === 2) digits = 8;
      else digits = 6;
    } else {
      skipField(wireType);
    }
  }

  if (!secretBytes || secretBytes.length === 0) return null;

  const secretBase32 = bytesToBase32(secretBytes);

  let finalIssuer = issuer.trim();
  let finalAccountName = name.trim();

  if (!finalIssuer && finalAccountName.includes(':')) {
    const parts = finalAccountName.split(':');
    finalIssuer = parts[0]?.trim() ?? '';
    finalAccountName = parts.slice(1).join(':').trim();
  }

  if (!finalIssuer) finalIssuer = 'İçe Aktarılan';
  if (!finalAccountName) finalAccountName = 'Hesap';

  return {
    issuer: finalIssuer,
    accountName: finalAccountName,
    secret: secretBase32,
    algorithm,
    digits,
    period,
    favorite: false,
    groupId: null,
  };
}
