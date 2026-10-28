import {
  createAccountRequestSchema,
  MAX_ACCOUNT_IMPORT_SIZE,
  type CreateAccountRequest,
} from '@shared/schemas/account';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const MAX_MIGRATION_URI_LENGTH = 128 * 1024;

function invalidPayload(): Error {
  return new Error('Aktarım verisi bozuk veya desteklenmeyen bir biçimde.');
}

// Unsigned arithmetic and bounds checks prevent overflow, backwards cursors and truncation.
class ProtoReader {
  private position = 0;
  constructor(private readonly bytes: Uint8Array) {}
  get done(): boolean {
    return this.position === this.bytes.length;
  }
  readVarint(): number {
    let value = 0;
    for (let index = 0; index < 5; index++) {
      const byte = this.bytes[this.position++];
      if (byte === undefined || (index === 4 && byte > 15)) throw invalidPayload();
      value += (byte & 0x7f) * 2 ** (index * 7);
      if ((byte & 0x80) === 0) return value;
    }
    throw invalidPayload();
  }
  readTag(): { field: number; wire: number } {
    const tag = this.readVarint();
    const field = Math.floor(tag / 8);
    const wire = tag % 8;
    if (field === 0 || ![0, 1, 2, 5].includes(wire)) throw invalidPayload();
    return { field, wire };
  }
  private take(length: number): Uint8Array {
    if (length > this.bytes.length - this.position) throw invalidPayload();
    const value = this.bytes.subarray(this.position, this.position + length);
    this.position += length;
    return value;
  }
  readBytes(): Uint8Array {
    return this.take(this.readVarint());
  }
  skip(wire: number): void {
    if (wire === 0) {
      // Unknown integer metadata may contain a signed int32 encoded as a ten-byte varint.
      for (let index = 0; index < 10; index++) {
        const byte = this.bytes[this.position++];
        if (byte === undefined || (index === 9 && byte > 1)) throw invalidPayload();
        if ((byte & 0x80) === 0) return;
      }
      throw invalidPayload();
    } else if (wire === 2) this.readBytes();
    else this.take(wire === 1 ? 8 : 4);
  }
}

function bytesToBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function parseOtpMigrationUri(uriString: string): CreateAccountRequest[] {
  if (uriString.length > MAX_MIGRATION_URI_LENGTH) throw invalidPayload();
  const url = new URL(uriString);
  if (url.protocol !== 'otpauth-migration:') {
    throw new Error('Geçersiz Google Authenticator dışa aktarım URL formatı.');
  }
  if (url.hostname !== 'offline') throw invalidPayload();
  const data = url.searchParams.get('data');
  if (!data) throw new Error('QR kodunda veri parametresi bulunamadı.');
  let bytes: Uint8Array;
  try {
    const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    throw invalidPayload();
  }
  const reader = new ProtoReader(bytes);
  const accounts: CreateAccountRequest[] = [];
  while (!reader.done) {
    const { field, wire } = reader.readTag();
    if (field === 1) {
      if (wire !== 2 || accounts.length >= MAX_ACCOUNT_IMPORT_SIZE) throw invalidPayload();
      accounts.push(parseOtpParameters(reader.readBytes()));
    } else reader.skip(wire);
  }
  if (accounts.length === 0) {
    throw new Error('QR kodunda aktarılabilecek hesap verisi bulunamadı.');
  }
  return accounts;
}

function parseOtpParameters(bytes: Uint8Array): CreateAccountRequest {
  const reader = new ProtoReader(bytes);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let secretBytes = new Uint8Array();
  let name = '';
  let issuer = '';
  let algorithm: CreateAccountRequest['algorithm'] = 'SHA1';
  let digits = 6;
  let type = 0;
  while (!reader.done) {
    const { field, wire } = reader.readTag();
    if (field >= 1 && field <= 3) {
      if (wire !== 2) throw invalidPayload();
      const value = reader.readBytes();
      if (field === 1) secretBytes = Uint8Array.from(value);
      if (field === 2) name = decoder.decode(value);
      if (field === 3) issuer = decoder.decode(value);
    } else if (field >= 4 && field <= 6) {
      if (wire !== 0) throw invalidPayload();
      const value = reader.readVarint();
      if (field === 4) {
        const algorithms = { 1: 'SHA1', 2: 'SHA256', 3: 'SHA512' } as const;
        if (!(value in algorithms)) throw invalidPayload();
        algorithm = algorithms[value as keyof typeof algorithms];
      } else if (field === 5) {
        if (value !== 1 && value !== 2) throw invalidPayload();
        digits = value === 2 ? 8 : 6;
      } else type = value;
    } else reader.skip(wire);
  }
  if (type !== 2) throw new Error('Yalnızca zaman tabanlı (TOTP) hesaplar aktarılabilir.');
  if (!secretBytes.length) throw invalidPayload();
  let accountName = name.trim();
  issuer = issuer.trim();
  if (!issuer && accountName.includes(':')) {
    const separator = accountName.indexOf(':');
    issuer = accountName.slice(0, separator).trim();
    accountName = accountName.slice(separator + 1).trim();
  }
  const result = createAccountRequestSchema.safeParse({
    issuer: issuer || 'İçe Aktarılan',
    accountName: accountName || 'Hesap',
    secret: bytesToBase32(secretBytes),
    algorithm,
    digits,
    period: 30,
  });
  if (!result.success) throw invalidPayload();
  return result.data;
}
