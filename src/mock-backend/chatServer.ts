import type { SqlDatabase, SqlValue } from '@/shared/db/sqlDatabase';

import { ApiError } from './errors';
import { createRandom, createSentence, generateHistory, HISTORY_SIZE } from './history';

export type Author = 'fan' | 'creator';

export type ServerMessage = {
  id: string;
  seq: number;
  clientId: string | null;
  author: Author;
  text: string;
  createdAt: number;
};

export type MessagePage = { messages: ServerMessage[]; hasMore: boolean };

export type SendMessageRequest = { clientId: string; text: string };

export const MAX_MESSAGE_LENGTH = 400;

type MessageRow = {
  seq: number;
  client_id: string | null;
  author: Author;
  text: string;
  created_at: number;
};

const SEED_BATCH_SIZE = 500;

const toMessage = (row: MessageRow): ServerMessage => ({
  id: `srv-${row.seq}`,
  seq: row.seq,
  clientId: row.client_id,
  author: row.author,
  text: row.text,
  createdAt: row.created_at,
});

type Options = { now?: () => number; historySize?: number };

export class ChatServer {
  private constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => number,
  ) {}

  static async open(db: SqlDatabase, { now = Date.now, historySize = HISTORY_SIZE }: Options = {}) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT,
        author TEXT NOT NULL CHECK (author IN ('fan', 'creator')),
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS messages_client_id
        ON messages (client_id) WHERE client_id IS NOT NULL;
    `);
    const server = new ChatServer(db, now);
    await server.seedIfEmpty(historySize);
    return server;
  }

  /**
   * Idempotent on `clientId`: a retry of an accepted send returns the stored message instead of
   * inserting a copy, so at-least-once delivery from the client yields exactly one message.
   */
  async sendMessage({ clientId, text }: SendMessageRequest): Promise<ServerMessage> {
    const body = text.trim();
    if (body.length === 0 || body.length > MAX_MESSAGE_LENGTH) {
      throw new ApiError(400, 'INVALID_REQUEST', 'Messages must be 1–400 characters.');
    }

    return this.db.transaction(async (tx) => {
      const existing = await tx.getFirst<MessageRow>('SELECT * FROM messages WHERE client_id = ?', [
        clientId,
      ]);
      if (existing) return toMessage(existing);

      const { lastInsertRowId } = await tx.run(
        'INSERT INTO messages (client_id, author, text, created_at) VALUES (?, ?, ?, ?)',
        [clientId, 'fan', body, this.now()],
      );
      const inserted = await tx.getFirst<MessageRow>('SELECT * FROM messages WHERE seq = ?', [
        lastInsertRowId,
      ]);
      if (!inserted) throw new Error(`Message ${lastInsertRowId} vanished after insert`);
      return toMessage(inserted);
    });
  }

  async getLatest(limit: number): Promise<MessagePage> {
    const rows = await this.db.getAll<MessageRow>(
      'SELECT * FROM messages ORDER BY seq DESC LIMIT ?',
      [limit + 1],
    );
    return {
      messages: rows.slice(0, limit).reverse().map(toMessage),
      hasMore: rows.length > limit,
    };
  }

  async getBefore(beforeSeq: number, limit: number): Promise<MessagePage> {
    const rows = await this.db.getAll<MessageRow>(
      'SELECT * FROM messages WHERE seq < ? ORDER BY seq DESC LIMIT ?',
      [beforeSeq, limit + 1],
    );
    return {
      messages: rows.slice(0, limit).reverse().map(toMessage),
      hasMore: rows.length > limit,
    };
  }

  async getAfter(afterSeq: number, limit: number): Promise<MessagePage> {
    const rows = await this.db.getAll<MessageRow>(
      'SELECT * FROM messages WHERE seq > ? ORDER BY seq ASC LIMIT ?',
      [afterSeq, limit + 1],
    );
    return { messages: rows.slice(0, limit).map(toMessage), hasMore: rows.length > limit };
  }

  /** Dev control: creator messages that arrive while the fan's device is offline. */
  async deliverIncoming(count: number): Promise<void> {
    const random = createRandom(this.now());
    await this.db.transaction(async (tx) => {
      for (let index = 0; index < count; index += 1) {
        await tx.run('INSERT INTO messages (author, text, created_at) VALUES (?, ?, ?)', [
          'creator',
          createSentence(random),
          this.now(),
        ]);
      }
    });
  }

  private async seedIfEmpty(historySize: number): Promise<void> {
    const existing = await this.db.getFirst<{ count: number }>(
      'SELECT COUNT(*) AS count FROM messages',
    );
    if ((existing?.count ?? 0) > 0) return;

    await this.db.transaction(async (tx) => {
      let batch: SqlValue[] = [];
      const flush = async () => {
        const rows = batch.length / 3;
        if (rows === 0) return;
        const placeholders = Array.from({ length: rows }, () => '(?, ?, ?)').join(', ');
        await tx.run(
          `INSERT INTO messages (author, text, created_at) VALUES ${placeholders}`,
          batch,
        );
        batch = [];
      };
      for (const message of generateHistory(historySize)) {
        batch.push(message.author, message.text, message.createdAt);
        if (batch.length === SEED_BATCH_SIZE * 3) await flush();
      }
      await flush();
    });
  }
}
