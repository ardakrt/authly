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
import { GroupRepository, type GroupRecord } from '../database/repositories/GroupRepository';
import { backupPayloadSchema, type BackupPayload } from '@shared/schemas/backup';

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
    private readonly groupRepository?: GroupRepository,
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

  async create(
    input: CreateAccountRequest,
    assertCanWrite: () => void = () => {},
  ): Promise<AccountDto> {
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
    const dto = toDto(record);
    assertCanWrite();
    this.repository.create(record);
    return dto;
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

  listGroups(): GroupRecord[] {
    return this.groupRepository?.list() ?? [];
  }

  async restoreBackup(
    input: BackupPayload,
    assertCanWrite: () => void = () => {},
  ): Promise<{ importedCount: number; ungroupedCount: number }> {
    const payload = backupPayloadSchema.parse(input);
    const existingGroups = this.listGroups();
    const groupsToCreate: GroupRecord[] = [];
    const groupMap = new Map<string, string>();
    if (payload.version === 2) {
      for (const group of payload.groups) {
        if (groupMap.has(group.id)) throw new Error('Yedekte yinelenen grup bilgisi var.');
        const existing = [...existingGroups, ...groupsToCreate].find(
          (item) => item.name === group.name,
        );
        const restored = existing ?? {
          ...group,
          id: randomUUID(),
          sortOrder: existingGroups.length + groupsToCreate.length,
        };
        groupMap.set(group.id, restored.id);
        if (!existing) groupsToCreate.push(restored);
      }
    }
    if (groupsToCreate.length && !this.groupRepository)
      throw new Error('Grup deposu kullanılamıyor.');
    let ungroupedCount = 0;
    const sortOrder = this.repository.list().length;
    const now = Date.now();
    const records: AccountRecord[] = [];
    for (const [index, account] of payload.accounts.entries()) {
      const { secret, ...metadata } = account;
      let groupId = account.groupId;
      if (groupId) {
        const mapped = groupMap.get(groupId);
        if (payload.version === 2 && !mapped) throw new Error('Yedekte eksik grup bilgisi var.');
        if (payload.version === 1 && !existingGroups.some((item) => item.id === groupId)) {
          groupId = null;
          ungroupedCount++;
        } else if (mapped) groupId = mapped;
      }
      records.push({
        ...metadata,
        groupId,
        id: randomUUID(),
        encryptedSecret: await this.vault.encryptSecret(secret),
        sortOrder: sortOrder + index,
        createdAt: now,
        updatedAt: now,
      });
      assertCanWrite();
    }
    records.forEach(toDto);
    assertCanWrite();
    this.repository.transaction(() => {
      for (const group of groupsToCreate) this.groupRepository!.create(group);
      for (const record of records) this.repository.create(record);
    });
    return { importedCount: records.length, ungroupedCount };
  }

  async update(
    input: UpdateAccountRequest,
    assertCanWrite: () => void = () => {},
  ): Promise<AccountDto> {
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
    const dto = toDto(updated);
    assertCanWrite();
    this.repository.update(updated);
    return dto;
  }

  delete(id: string): void {
    if (!this.repository.delete(id)) throw new Error('Account not found.');
  }
}
