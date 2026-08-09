import type Database from 'better-sqlite3';

export interface GroupRecord {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

interface GroupRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

const mapRow = (row: GroupRow): GroupRecord => ({
  id: row.id,
  name: row.name,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class GroupRepository {
  constructor(private readonly database: Database.Database) {}

  list(): GroupRecord[] {
    return (
      this.database
        .prepare(
          'SELECT id, name, sort_order, created_at, updated_at FROM groups ORDER BY sort_order, created_at',
        )
        .all() as GroupRow[]
    ).map(mapRow);
  }

  create(group: GroupRecord): void {
    this.database
      .prepare(
        'INSERT INTO groups (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(group.id, group.name, group.sortOrder, group.createdAt, group.updatedAt);
  }

  update(group: GroupRecord): void {
    const result = this.database
      .prepare('UPDATE groups SET name = ?, sort_order = ?, updated_at = ? WHERE id = ?')
      .run(group.name, group.sortOrder, group.updatedAt, group.id);
    if (result.changes !== 1) throw new Error('Group not found.');
  }

  delete(id: string): boolean {
    return this.database.prepare('DELETE FROM groups WHERE id = ?').run(id).changes === 1;
  }
}
