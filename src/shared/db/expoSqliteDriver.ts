import { deleteDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';

import { createSqlDatabase, type SqlDatabase } from './sqlDatabase';

export async function openExpoDatabase(name: string): Promise<SqlDatabase> {
  const db = await openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  return createSqlDatabase({
    exec: (sql) => db.execAsync(sql),
    run: (sql, params = []) => db.runAsync(sql, params),
    getAll: (sql, params = []) => db.getAllAsync(sql, params),
    getFirst: (sql, params = []) => db.getFirstAsync(sql, params),
    close: () => db.closeAsync(),
  });
}

export async function deleteExpoDatabase(name: string): Promise<void> {
  try {
    await deleteDatabaseAsync(name);
  } catch (error) {
    if (!String(error).includes('not found')) throw error;
  }
}
