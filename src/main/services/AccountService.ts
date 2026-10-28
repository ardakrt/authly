import { randomUUID } from 'node:crypto';
import type {
  AccountDto,
  CreateAccountRequest,
  ImportAccountsRequest,
  UpdateAccountRequest,
} from '@shared/schemas/account';
import {
  accountDtoSchema,
  createAccountRequestSchema,
  importAccountsRequestSchema,
  updateAccountRequestSchema,
} from '@shared/schemas/account';
import { AccountRepository, type AccountRecord } from '../database/repositories/AccountRepository';
import type { VaultService } from '../security/VaultService';
import type { TotpCode } from '@shared/schemas/totp';
import type { TotpService } from './TotpService';

function toDto(record: AccountRecord): AccountDto {
  return accountDtoSchema.parse({
    id: record.id,
    issuer: record.issuer,
    accountName: record.accountName,
    algorithm: record.algorithm,
    digits: record.digits,
    period: record.period,
    favorite: record.favorite,
    groupId: record.groupId,
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export class AccountService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly vault: VaultService,
    private readonly totpService?: TotpService,
  ) {}

  list(): AccountDto[] {
    return this.repository.list().map(toDto);
  }

  async getTotpCodes(): Promise<TotpCode[]> {
    if (!this.totpService) throw new Error('TOTP service unavailable.');
    const results = await Promise.allSettled(
      this.repository.list().map((account) => this.getTotpCode(account.id)),
    );
    return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  }

  async getTotpCode(id: string): Promise<TotpCode> {
    if (!this.totpService) throw new Error('TOTP service unavailable.');
    const { secret, algorithm, digits, period } = await this.getTotpSecret(id);
    return { accountId: id, ...this.totpService.generate(secret, algorithm, digits, period) };
  }

  async getTotpSecret(id: string): Promise<{
    secret: string;
    algorithm: AccountDto['algorithm'];
    digits: number;
    period: number;
  }> {
    const account = this.repository.getById(id);
    if (!account) throw new Error('Account not found.');
    const decrypted = await this.vault.decryptSecret(account.encryptedSecret);
    if (decrypted.reEncrypted) {
      this.repository.updateEncryptedSecret(id, decrypted.reEncrypted);
    }
    return {
      secret: decrypted.secret,
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period,
    };
  }

  async create(input: CreateAccountRequest): Promise<AccountDto> {
    input = createAccountRequestSchema.parse(input);
    const now = Date.now();
    const record: AccountRecord = {
      id: randomUUID(),
      issuer: input.issuer,
      accountName: input.accountName,
      encryptedSecret: await this.vault.encryptSecret(input.secret),
      algorithm: input.algorithm,
      digits: input.digits,
      period: input.period,
      favorite: input.favorite,
      groupId: input.groupId,
      sortOrder: this.repository.list().length,
      createdAt: now,
      updatedAt: now,
    };
    this.repository.create(record);
    return toDto(record);
  }

  async importAccounts(
    input: ImportAccountsRequest,
    assertCanWrite: () => void = () => {},
  ): Promise<AccountDto[]> {
    const { accounts } = importAccountsRequestSchema.parse(input);
    const now = Date.now();
    const sortOrder = this.repository.list().length;
    // Finish every asynchronous encryption before opening the synchronous SQLite transaction.
    const records = await Promise.all(
      accounts.map(async ({ secret, ...metadata }, index): Promise<AccountRecord> => ({
        ...metadata,
        id: randomUUID(),
        encryptedSecret: await this.vault.encryptSecret(secret),
        sortOrder: sortOrder + index,
        createdAt: now,
        updatedAt: now,
      })),
    );
    const dtos = records.map(toDto);
    assertCanWrite();
    this.repository.createMany(records);
    return dtos;
  }

  async update(input: UpdateAccountRequest): Promise<AccountDto> {
    input = updateAccountRequestSchema.parse(input);
    const current = this.repository.getById(input.id);
    if (!current) throw new Error('Account not found.');
    const updated: AccountRecord = {
      ...current,
      issuer: input.issuer,
      accountName: input.accountName,
      algorithm: input.algorithm,
      digits: input.digits,
      period: input.period,
      favorite: input.favorite,
      groupId: input.groupId,
      encryptedSecret: input.secret
        ? await this.vault.encryptSecret(input.secret)
        : current.encryptedSecret,
      updatedAt: Date.now(),
    };
    this.repository.update(updated);
    return toDto(updated);
  }

  delete(id: string): void {
    if (!this.repository.delete(id)) throw new Error('Account not found.');
  }
}
