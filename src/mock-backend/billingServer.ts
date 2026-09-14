import { createStore, type StoreApi } from 'zustand/vanilla';

import type { SqlDatabase } from '@/shared/db/sqlDatabase';

import { ApiError } from './errors';

export type ProductId = 'all_access_monthly' | 'all_access_yearly';

export const PRODUCT_PERIOD_MS: Record<ProductId, number> = {
  all_access_monthly: 30 * 24 * 60 * 60 * 1_000,
  all_access_yearly: 365 * 24 * 60 * 60 * 1_000,
};

export type Entitlement =
  { isActive: true; productId: ProductId; expiresAt: number } | { isActive: false };

export type VerifyPurchaseRequest = { transactionId: string; productId: ProductId };

export type VerifyPurchaseResponse = {
  status: 'pending' | 'verified';
  entitlement: Entitlement;
};

export type ConfirmationMode = 'instant' | 'delayed' | 'manual';

export type BillingSettings = { confirmationMode: ConfirmationMode };

export const DELAYED_CONFIRMATION_MS = 8_000;

type PurchaseRow = {
  transaction_id: string;
  product_id: ProductId;
  received_at: number;
  confirm_at: number | null;
  verified_at: number | null;
};

const isProductId = (value: string): value is ProductId => value in PRODUCT_PERIOD_MS;

/**
 * The backend's record of paid access. The store saying "purchased" is only a claim; access
 * exists once this server has verified the transaction.
 */
export class BillingServer {
  readonly settings: StoreApi<BillingSettings> = createStore<BillingSettings>(() => ({
    confirmationMode: 'instant',
  }));

  private constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => number,
  ) {}

  static async open(db: SqlDatabase, { now = Date.now }: { now?: () => number } = {}) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS purchases (
        transaction_id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        received_at INTEGER NOT NULL,
        confirm_at INTEGER,
        verified_at INTEGER
      );
    `);
    return new BillingServer(db, now);
  }

  /** Idempotent on `transactionId`: repeated verification never extends or duplicates access. */
  async verifyPurchase({
    transactionId,
    productId,
  }: VerifyPurchaseRequest): Promise<VerifyPurchaseResponse> {
    if (!isProductId(productId)) {
      throw new ApiError(400, 'INVALID_REQUEST', `Unknown product ${productId}`);
    }

    const now = this.now();
    const { confirmationMode } = this.settings.getState();
    const confirmAt =
      confirmationMode === 'instant'
        ? now
        : confirmationMode === 'delayed'
          ? now + DELAYED_CONFIRMATION_MS
          : null;

    await this.db.run(
      `INSERT OR IGNORE INTO purchases (transaction_id, product_id, received_at, confirm_at)
       VALUES (?, ?, ?, ?)`,
      [transactionId, productId, now, confirmAt],
    );
    await this.promoteDue();

    const row = await this.db.getFirst<PurchaseRow>(
      'SELECT * FROM purchases WHERE transaction_id = ?',
      [transactionId],
    );
    return {
      status: row?.verified_at ? 'verified' : 'pending',
      entitlement: await this.getEntitlement(),
    };
  }

  async getEntitlement(): Promise<Entitlement> {
    await this.promoteDue();
    const rows = await this.db.getAll<PurchaseRow>(
      'SELECT * FROM purchases WHERE verified_at IS NOT NULL',
    );
    const now = this.now();
    let best: Entitlement = { isActive: false };
    for (const row of rows) {
      const expiresAt = row.verified_at! + PRODUCT_PERIOD_MS[row.product_id];
      if (expiresAt > now && (!best.isActive || expiresAt > best.expiresAt)) {
        best = { isActive: true, productId: row.product_id, expiresAt };
      }
    }
    return best;
  }

  async hasPaidAccess(): Promise<boolean> {
    return (await this.getEntitlement()).isActive;
  }

  /** Dev control: the payment processor finally reports back for purchases held as pending. */
  async confirmPendingNow(): Promise<void> {
    await this.db.run('UPDATE purchases SET confirm_at = ? WHERE verified_at IS NULL', [
      this.now(),
    ]);
    await this.promoteDue();
  }

  /** Dev control: this backend no longer knows about any purchase (e.g. a new account link). */
  async forgetPurchases(): Promise<void> {
    await this.db.run('DELETE FROM purchases');
  }

  private async promoteDue(): Promise<void> {
    const now = this.now();
    await this.db.run(
      `UPDATE purchases SET verified_at = confirm_at
       WHERE verified_at IS NULL AND confirm_at IS NOT NULL AND confirm_at <= ?`,
      [now],
    );
  }
}
