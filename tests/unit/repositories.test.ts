import { describe, expect, it } from 'vitest';
import { LocalDatabase } from '../../src/main/database/LocalDatabase';
import { GroupRepository } from '../../src/main/database/repositories/GroupRepository';
import { SettingsRepository } from '../../src/main/database/repositories/SettingsRepository';

describe('local group and settings repositories', () => {
  it('supports group CRUD', () => {
    const database = new LocalDatabase(':memory:');
    const groups = new GroupRepository(database.connection);
    const group = { id: 'work', name: 'Work', sortOrder: 0, createdAt: 1, updatedAt: 1 };

    groups.create(group);
    expect(groups.list()).toEqual([group]);
    groups.update({ ...group, name: 'Personal', updatedAt: 2 });
    expect(groups.list()[0]?.name).toBe('Personal');
    expect(groups.delete(group.id)).toBe(true);
    expect(groups.list()).toEqual([]);
    database.close();
  });

  it('supports setting upsert and delete', () => {
    const database = new LocalDatabase(':memory:');
    const settings = new SettingsRepository(database.connection);

    expect(settings.get('theme')).toBeNull();
    settings.set('theme', 'dark');
    settings.set('theme', 'light');
    expect(settings.get('theme')).toBe('light');
    expect(settings.delete('theme')).toBe(true);
    expect(settings.get('theme')).toBeNull();
    database.close();
  });
});
