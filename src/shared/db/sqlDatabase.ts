export type SqlValue = string | number | null;

export type RunResult = { changes: number; lastInsertRowId: number };

export interface SqlExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<RunResult>;
  getAll<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  getFirst<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
}

export interface SqlDriver extends SqlExecutor {
  close(): Promise<void>;
}

export interface SqlDatabase extends SqlExecutor {
  transaction<T>(task: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * Serializes every statement on one connection. SQLite has a single writer anyway, and
 * serializing guarantees no unrelated query can run inside another caller's transaction.
 */
export function createSqlDatabase(driver: SqlDriver): SqlDatabase {
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task, task);
    queue = result.catch(() => undefined);
    return result;
  };

  return {
    exec: (sql) => enqueue(() => driver.exec(sql)),
    run: (sql, params) => enqueue(() => driver.run(sql, params)),
    getAll: (sql, params) => enqueue(() => driver.getAll(sql, params)),
    getFirst: (sql, params) => enqueue(() => driver.getFirst(sql, params)),
    transaction: (task) =>
      enqueue(async () => {
        await driver.exec('BEGIN IMMEDIATE');
        try {
          const value = await task(driver);
          await driver.exec('COMMIT');
          return value;
        } catch (error) {
          await driver.exec('ROLLBACK');
          throw error;
        }
      }),
    close: () => enqueue(() => driver.close()),
  };
}
