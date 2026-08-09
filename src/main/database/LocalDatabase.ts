import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

export class LocalDatabase {
  readonly connection: Database.Database;

  constructor(path: string) {
    this.connection = new Database(path, { timeout: 5_000 });
    this.connection.pragma('foreign_keys = ON');
    this.connection.pragma('journal_mode = WAL');
    this.connection.pragma('synchronous = FULL');
    runMigrations(this.connection);
  }

  close(): void {
    if (this.connection.open) this.connection.close();
  }
}
