import Database from 'better-sqlite3';

import { createSqlDatabase, type SqlDatabase } from '../sqlDatabase';

/**
 * Test-only file database registry: opening the same name twice returns the same on-disk
 * state, so a test can drop every in-memory object and "relaunch" against persisted data.
 */
export function createTestDatabaseHost() {
  const files = new Map<string, Database.Database>();

  const open = async (name: string): Promise<SqlDatabase> => {
    let raw = files.get(name);
    if (!raw) {
      raw = new Database(':memory:');
      files.set(name, raw);
    }
    const connection = raw;
    return createSqlDatabase({
      exec: async (sql) => {
        connection.exec(sql);
      },
      run: async (sql, params = []) => {
        const result = connection.prepare(sql).run(params);
        return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
      },
      getAll: async <T>(sql: string, params: (string | number | null)[] = []) =>
        connection.prepare(sql).all(params) as T[],
      getFirst: async <T>(sql: string, params: (string | number | null)[] = []) =>
        (connection.prepare(sql).get(params) as T | undefined) ?? null,
      close: async () => undefined,
    });
  };

  const remove = async (name: string) => {
    files.get(name)?.close();
    files.delete(name);
  };

  return { open, remove };
}
