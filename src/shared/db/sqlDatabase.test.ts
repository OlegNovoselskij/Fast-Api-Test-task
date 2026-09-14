import { createTestDatabaseHost } from './testing/nodeSqliteDriver';

describe('createSqlDatabase', () => {
  it('rolls back every statement of a failed transaction', async () => {
    const db = await createTestDatabaseHost().open('rollback');
    await db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');

    await expect(
      db.transaction(async (tx) => {
        await tx.run('INSERT INTO items (name) VALUES (?)', ['kept?']);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await db.getAll('SELECT * FROM items')).toEqual([]);
  });

  it('does not let a concurrent statement run inside another transaction', async () => {
    const db = await createTestDatabaseHost().open('isolation');
    await db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');

    const failing = db.transaction(async (tx) => {
      await tx.run('INSERT INTO items (name) VALUES (?)', ['inside']);
      await new Promise((resolve) => setTimeout(resolve, 5));
      throw new Error('rollback');
    });
    const outside = db.run('INSERT INTO items (name) VALUES (?)', ['outside']);

    await expect(failing).rejects.toThrow('rollback');
    await outside;
    expect(await db.getAll<{ name: string }>('SELECT name FROM items')).toEqual([
      { name: 'outside' },
    ]);
  });
});
