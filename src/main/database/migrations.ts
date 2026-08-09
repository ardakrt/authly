import type Database from 'better-sqlite3';

const migrations = [
  {
    id: 1,
    sql: `
      CREATE TABLE groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        issuer TEXT NOT NULL,
        account_name TEXT NOT NULL,
        encrypted_secret BLOB NOT NULL,
        algorithm TEXT NOT NULL CHECK (algorithm IN ('SHA1', 'SHA256', 'SHA512')),
        digits INTEGER NOT NULL CHECK (digits BETWEEN 6 AND 10),
        period INTEGER NOT NULL CHECK (period BETWEEN 5 AND 300),
        favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
        group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;

      CREATE INDEX accounts_order_idx ON accounts(favorite DESC, sort_order ASC, created_at ASC);
      CREATE INDEX accounts_group_idx ON accounts(group_id);

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;
    `,
  },
] as const;

export function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    ) STRICT;
  `);

  const applied = database.prepare('SELECT 1 FROM schema_migrations WHERE id = ?');
  const record = database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');

  for (const migration of migrations) {
    if (applied.get(migration.id)) continue;
    database.transaction(() => {
      database.exec(migration.sql);
      record.run(migration.id, Date.now());
    })();
  }
}
