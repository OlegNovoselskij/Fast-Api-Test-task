import { createStore, type StoreApi } from 'zustand/vanilla';

import type { ProductId } from '@/mock-backend/billingServer';
import type { SqlDatabase } from '@/shared/db/sqlDatabase';

export type { ProductId };

export type Product = { id: ProductId; title: string; price: string; period: string };

export const PRODUCTS: Product[] = [
  { id: 'all_access_monthly', title: 'Monthly', price: '$9.99', period: 'month' },
  { id: 'all_access_yearly', title: 'Yearly', price: '$79.99', period: 'year' },
];

export type StoreTransaction = { id: string; productId: ProductId; purchasedAt: number };

export type PurchaseResult =
  | { status: 'purchased'; transaction: StoreTransaction }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };

export type PurchaseOutcome = 'success' | 'cancel' | 'fail';

export type StoreSettings = { nextOutcome: PurchaseOutcome };

type TransactionRow = {
  id: string;
  product_id: ProductId;
  purchased_at: number;
  finished: number;
};

type Options = {
  createId: () => string;
  now?: () => number;
  sheetDelayMs?: number;
};

const toTransaction = (row: TransactionRow): StoreTransaction => ({
  id: row.id,
  productId: row.product_id,
  purchasedAt: row.purchased_at,
});

/**
 * Stand-in for StoreKit / Play Billing: the platform account that owns receipts. It lives in
 * its own database so its records outlive app data and stay separate from backend access.
 */
export class MockStore {
  readonly settings: StoreApi<StoreSettings> = createStore<StoreSettings>(() => ({
    nextOutcome: 'success',
  }));

  private readonly listeners = new Set<(transaction: StoreTransaction) => void>();
  private lastTransaction: StoreTransaction | null = null;

  private constructor(
    private readonly db: SqlDatabase,
    private readonly options: Required<Options>,
  ) {}

  static async open(db: SqlDatabase, { createId, now = Date.now, sheetDelayMs = 1_200 }: Options) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        purchased_at INTEGER NOT NULL,
        finished INTEGER NOT NULL DEFAULT 0
      );
    `);
    return new MockStore(db, { createId, now, sheetDelayMs });
  }

  async purchase(productId: ProductId): Promise<PurchaseResult> {
    await wait(this.options.sheetDelayMs);
    const { nextOutcome } = this.settings.getState();
    if (nextOutcome === 'cancel') return { status: 'cancelled' };
    if (nextOutcome === 'fail') {
      return { status: 'failed', message: 'The store could not complete the purchase.' };
    }

    const transaction: StoreTransaction = {
      id: this.options.createId(),
      productId,
      purchasedAt: this.options.now(),
    };
    await this.db.run('INSERT INTO transactions (id, product_id, purchased_at) VALUES (?, ?, ?)', [
      transaction.id,
      transaction.productId,
      transaction.purchasedAt,
    ]);
    this.lastTransaction = transaction;
    this.emit(transaction);
    return { status: 'purchased', transaction };
  }

  /** Like `Transaction.updates`: the same transaction can be delivered more than once. */
  onTransactionUpdate(listener: (transaction: StoreTransaction) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async unfinishedTransactions(): Promise<StoreTransaction[]> {
    const rows = await this.db.getAll<TransactionRow>(
      'SELECT * FROM transactions WHERE finished = 0 ORDER BY purchased_at',
    );
    return rows.map(toTransaction);
  }

  async restorePurchases(): Promise<StoreTransaction[]> {
    await wait(this.options.sheetDelayMs);
    const rows = await this.db.getAll<TransactionRow>(
      'SELECT * FROM transactions ORDER BY purchased_at',
    );
    return rows.map(toTransaction);
  }

  async finishTransaction(transactionId: string): Promise<void> {
    await this.db.run('UPDATE transactions SET finished = 1 WHERE id = ?', [transactionId]);
  }

  /** Dev control: redeliver the most recent transaction event. */
  replayLastTransaction(): boolean {
    if (!this.lastTransaction) return false;
    this.emit(this.lastTransaction);
    return true;
  }

  private emit(transaction: StoreTransaction): void {
    for (const listener of this.listeners) listener(transaction);
  }
}

const wait = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
