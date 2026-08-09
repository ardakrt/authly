import type Database from 'better-sqlite3';

export class SettingsRepository {
  constructor(private readonly database: Database.Database) {}

  get(key: string): string | null {
    const row = this.database.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      { value: string } | undefined;
    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    this.database
      .prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(key, value, Date.now());
  }

  delete(key: string): boolean {
    return this.database.prepare('DELETE FROM settings WHERE key = ?').run(key).changes === 1;
  }
}
