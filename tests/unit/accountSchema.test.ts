import { describe, expect, it } from 'vitest';
import {
  base32SecretSchema,
  createAccountRequestSchema,
  importAccountsRequestSchema,
  MAX_ACCOUNT_IMPORT_SIZE,
  updateAccountRequestSchema,
} from '../../src/shared/schemas/account';
import { backupAccountItemSchema } from '../../src/shared/schemas/backup';

const input = { issuer: 'Fixture', accountName: 'fixture', secret: 'JBSWY3DPEHPK3PXP' };

describe('account secret validation', () => {
  it.each(['INVALID!', '========', 'AAAAAAAAA', 'AAAAAAAAAB', 'AAAAAAAAAA=', 'AAAAAAAA='])(
    'rejects malformed Base32 fixture %s at every write boundary',
    (secret) => {
      expect(base32SecretSchema.safeParse(secret).success).toBe(false);
      expect(createAccountRequestSchema.safeParse({ ...input, secret }).success).toBe(false);
      expect(
        updateAccountRequestSchema.safeParse({
          ...input,
          id: 'a4ff59c6-2df2-4136-86ba-78bd57a617d8',
          secret,
        }).success,
      ).toBe(false);
      expect(backupAccountItemSchema.safeParse({ ...input, secret }).success).toBe(false);
    },
  );

  it('normalizes separators, case and correct padding', () => {
    expect(base32SecretSchema.parse(' jbsw-y3dp ehpk3pxp ')).toBe(input.secret);
    expect(base32SecretSchema.parse('AAAAAAAAAA======')).toBe('AAAAAAAAAA');
  });

  it('bounds batch sizes and validates every account before import', () => {
    expect(importAccountsRequestSchema.safeParse({ accounts: [] }).success).toBe(false);
    expect(
      importAccountsRequestSchema.safeParse({
        accounts: Array(MAX_ACCOUNT_IMPORT_SIZE + 1).fill(input),
      }).success,
    ).toBe(false);
    expect(
      importAccountsRequestSchema.safeParse({ accounts: [input, { ...input, secret: 'INVALID!' }] })
        .success,
    ).toBe(false);
  });
});
