import type { SqlDatabase, SqlValue } from '@/shared/db/sqlDatabase';

import type { OutboxEntry, SendError, SendErrorCode, ServerMessage } from '../types';

type OutboxRow = {
  local_order: number;
  client_id: string;
  text: string;
  created_at: number;
  status: 'queued' | 'failed';
  attempts: number;
  error_code: SendErrorCode | null;
  error_message: string | null;
  error_retryable: number | null;
};

type MessageRow = {
  seq: number;
  id: string;
  client_id: string | null;
  author: ServerMessage['author'];
  text: string;
  created_at: number;
};

const toEntry = (row: OutboxRow): OutboxEntry => ({
  clientId: row.client_id,
  localOrder: row.local_order,
  text: row.text,
  createdAt: row.created_at,
  status: row.status,
  attempts: row.attempts,
  error:
    row.error_code === null
      ? null
      : {
          code: row.error_code,
          message: row.error_message ?? '',
          isRetryable: row.error_retryable === 1,
        },
});

const toMessage = (row: MessageRow): ServerMessage => ({
  id: row.id,
  seq: row.seq,
  clientId: row.client_id,
  author: row.author,
  text: row.text,
  createdAt: row.created_at,
});

const SYNC_CURSOR_KEY = 'syncedThroughSeq';

/**
 * The client's durable state. The outbox is the source of truth for unsent messages; the
 * message cache mirrors what the server has confirmed and is never the pending queue.
 */
export class ChatLocalStore {
  private constructor(private readonly db: SqlDatabase) {}

  static async open(db: SqlDatabase): Promise<ChatLocalStore> {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS outbox (
        local_order INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL UNIQUE,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('queued', 'failed')),
        attempts INTEGER NOT NULL DEFAULT 0,
        error_code TEXT,
        error_message TEXT,
        error_retryable INTEGER
      );
      CREATE TABLE IF NOT EXISTS messages (
        seq INTEGER PRIMARY KEY,
        id TEXT NOT NULL UNIQUE,
        client_id TEXT,
        author TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    return new ChatLocalStore(db);
  }

  async enqueue(clientId: string, text: string, createdAt: number): Promise<OutboxEntry> {
    const { lastInsertRowId } = await this.db.run(
      "INSERT INTO outbox (client_id, text, created_at, status) VALUES (?, ?, ?, 'queued')",
      [clientId, text, createdAt],
    );
    return {
      clientId,
      localOrder: lastInsertRowId,
      text,
      createdAt,
      status: 'queued',
      attempts: 0,
      error: null,
    };
  }

  async listOutbox(): Promise<OutboxEntry[]> {
    const rows = await this.db.getAll<OutboxRow>('SELECT * FROM outbox ORDER BY local_order ASC');
    return rows.map(toEntry);
  }

  async recordAttempt(clientId: string): Promise<void> {
    await this.db.run('UPDATE outbox SET attempts = attempts + 1 WHERE client_id = ?', [clientId]);
  }

  async markFailed(clientId: string, error: SendError): Promise<void> {
    await this.db.run(
      `UPDATE outbox SET status = 'failed', error_code = ?, error_message = ?, error_retryable = ?
       WHERE client_id = ?`,
      [error.code, error.message, error.isRetryable ? 1 : 0, clientId],
    );
  }

  async requeue(clientIds: string[]): Promise<void> {
    if (clientIds.length === 0) return;
    await this.db.run(
      `UPDATE outbox SET status = 'queued', attempts = 0, error_code = NULL, error_message = NULL,
       error_retryable = NULL WHERE client_id IN (${placeholders(clientIds)})`,
      clientIds,
    );
  }

  async discard(clientId: string): Promise<void> {
    await this.db.run('DELETE FROM outbox WHERE client_id = ?', [clientId]);
  }

  /** Stores server-confirmed messages and removes their outbox entries in one transaction. */
  async commitConfirmed(
    messages: ServerMessage[],
    confirmedClientIds: string[],
    syncedThroughSeq?: number,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const chunk of chunks(messages, 150)) {
        const values: SqlValue[] = chunk.flatMap((m) => [
          m.seq,
          m.id,
          m.clientId,
          m.author,
          m.text,
          m.createdAt,
        ]);
        await tx.run(
          `INSERT OR REPLACE INTO messages (seq, id, client_id, author, text, created_at)
           VALUES ${chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}`,
          values,
        );
      }
      if (confirmedClientIds.length > 0) {
        await tx.run(
          `DELETE FROM outbox WHERE client_id IN (${placeholders(confirmedClientIds)})`,
          confirmedClientIds,
        );
      }
      if (syncedThroughSeq !== undefined) {
        await tx.run('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [
          SYNC_CURSOR_KEY,
          String(syncedThroughSeq),
        ]);
      }
    });
  }

  /** Highest seq up to which the cache is known to be gap-free. */
  async getSyncedThroughSeq(): Promise<number | null> {
    const row = await this.db.getFirst<{ value: string }>('SELECT value FROM kv WHERE key = ?', [
      SYNC_CURSOR_KEY,
    ]);
    return row ? Number(row.value) : null;
  }

  async latestMessages(limit: number): Promise<ServerMessage[]> {
    const rows = await this.db.getAll<MessageRow>(
      'SELECT * FROM messages ORDER BY seq DESC LIMIT ?',
      [limit],
    );
    return rows.reverse().map(toMessage);
  }

  async messagesBefore(beforeSeq: number, limit: number): Promise<ServerMessage[]> {
    const rows = await this.db.getAll<MessageRow>(
      'SELECT * FROM messages WHERE seq < ? ORDER BY seq DESC LIMIT ?',
      [beforeSeq, limit],
    );
    return rows.reverse().map(toMessage);
  }
}

const placeholders = (values: unknown[]) => values.map(() => '?').join(', ');

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}
