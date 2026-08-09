import type Database from 'better-sqlite3';
import type { AccountDto } from '@shared/schemas/account';

export interface AccountRecord extends AccountDto {
  encryptedSecret: Buffer;
}

interface AccountRow {
  id: string;
  issuer: string;
  account_name: string;
  encrypted_secret: Buffer;
  algorithm: AccountDto['algorithm'];
  digits: number;
  period: number;
  favorite: number;
  group_id: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

const SELECT_COLUMNS = `id, issuer, account_name, encrypted_secret, algorithm, digits, period,
  favorite, group_id, sort_order, created_at, updated_at`;

function mapRow(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    issuer: row.issuer,
    accountName: row.account_name,
    encryptedSecret: row.encrypted_secret,
    algorithm: row.algorithm,
    digits: row.digits,
    period: row.period,
    favorite: row.favorite === 1,
    groupId: row.group_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AccountRepository {
  constructor(private readonly database: Database.Database) {}

  list(): AccountRecord[] {
    const rows = this.database
      .prepare(
        `SELECT ${SELECT_COLUMNS} FROM accounts ORDER BY favorite DESC, sort_order, created_at`,
      )
      .all() as AccountRow[];
    return rows.map(mapRow);
  }

  getById(id: string): AccountRecord | null {
    const row = this.database
      .prepare(`SELECT ${SELECT_COLUMNS} FROM accounts WHERE id = ?`)
      .get(id) as AccountRow | undefined;
    return row ? mapRow(row) : null;
  }

  create(record: AccountRecord): void {
    this.database
      .prepare(
        `INSERT INTO accounts (
        id, issuer, account_name, encrypted_secret, algorithm, digits, period,
        favorite, group_id, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.issuer,
        record.accountName,
        record.encryptedSecret,
        record.algorithm,
        record.digits,
        record.period,
        record.favorite ? 1 : 0,
        record.groupId,
        record.sortOrder,
        record.createdAt,
        record.updatedAt,
      );
  }

  update(record: AccountRecord): void {
    const result = this.database
      .prepare(
        `UPDATE accounts SET issuer = ?, account_name = ?, encrypted_secret = ?,
        algorithm = ?, digits = ?, period = ?, favorite = ?, group_id = ?, updated_at = ?
        WHERE id = ?`,
      )
      .run(
        record.issuer,
        record.accountName,
        record.encryptedSecret,
        record.algorithm,
        record.digits,
        record.period,
        record.favorite ? 1 : 0,
        record.groupId,
        record.updatedAt,
        record.id,
      );
    if (result.changes !== 1) throw new Error('Account not found.');
  }

  updateEncryptedSecret(id: string, encryptedSecret: Buffer): void {
    const result = this.database
      .prepare('UPDATE accounts SET encrypted_secret = ? WHERE id = ?')
      .run(encryptedSecret, id);
    if (result.changes !== 1) throw new Error('Account not found.');
  }

  delete(id: string): boolean {
    return this.database.prepare('DELETE FROM accounts WHERE id = ?').run(id).changes === 1;
  }
}
