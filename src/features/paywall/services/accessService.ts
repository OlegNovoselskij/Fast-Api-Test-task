import { createStore, type StoreApi } from 'zustand/vanilla';

import type { BillingApi } from '@/mock-backend/billingApi';
import type { Entitlement } from '@/mock-backend/billingServer';
import { TransportError } from '@/mock-backend/errors';
import type { MockStore, ProductId, StoreTransaction } from '@/mock-store/mockStore';

export type PurchaseFlow =
  | { status: 'idle' }
  | { status: 'purchasing'; productId: ProductId }
  | { status: 'restoring' }
  | { status: 'verifying'; productId: ProductId }
  | { status: 'pendingConfirmation'; productId: ProductId; isOffline: boolean }
  | { status: 'confirmed'; productId: ProductId }
  | { status: 'cancelled'; productId: ProductId }
  | { status: 'failed'; productId: ProductId | null; message: string }
  | { status: 'nothingToRestore' };

export type AccessState = {
  /** `null` until the backend has answered at least once on this install. */
  entitlement: Entitlement | null;
  flow: PurchaseFlow;
};

export type EntitlementCache = {
  read(): Entitlement | null;
  write(entitlement: Entitlement): void;
};

export type Connectivity = {
  onConnectivityChange(listener: (isOnline: boolean) => void): () => void;
};

type Dependencies = {
  store: MockStore;
  api: BillingApi;
  connectivity: Connectivity;
  cache: EntitlementCache;
  pollIntervalMs?: number;
};

const BUSY: PurchaseFlow['status'][] = [
  'purchasing',
  'restoring',
  'verifying',
  'pendingConfirmation',
];

export const isFlowBusy = (flow: PurchaseFlow) => BUSY.includes(flow.status);

/**
 * Keeps two facts apart: what the store says was bought, and what the backend has confirmed.
 * Only the backend's entitlement grants access. Store transactions are finished only after the
 * backend verified them, so an interrupted purchase is recovered on the next launch.
 */
export class AccessService {
  readonly state: StoreApi<AccessState>;

  private readonly store: MockStore;
  private readonly api: BillingApi;
  private readonly connectivity: Connectivity;
  private readonly cache: EntitlementCache;
  private readonly pollIntervalMs: number;

  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly awaitingConfirmation = new Map<string, StoreTransaction>();
  private readonly settled = new Set<string>();
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: (() => void)[] = [];
  private isStopped = false;

  constructor({ store, api, connectivity, cache, pollIntervalMs = 2_000 }: Dependencies) {
    this.store = store;
    this.api = api;
    this.connectivity = connectivity;
    this.cache = cache;
    this.pollIntervalMs = pollIntervalMs;
    this.state = createStore<AccessState>(() => ({
      entitlement: cache.read(),
      flow: { status: 'idle' },
    }));
  }

  async start(): Promise<void> {
    this.subscriptions = [
      this.store.onTransactionUpdate((transaction) => void this.handleTransaction(transaction)),
      this.connectivity.onConnectivityChange((isOnline) => {
        if (isOnline) void this.resume();
      }),
    ];
    await this.resume();
  }

  stop(): void {
    this.isStopped = true;
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    if (this.pollTimer) clearTimeout(this.pollTimer);
  }

  async purchase(productId: ProductId): Promise<void> {
    if (isFlowBusy(this.flow)) return;
    this.setFlow({ status: 'purchasing', productId });

    const result = await this.store.purchase(productId);
    if (result.status === 'cancelled') {
      this.setFlow({ status: 'cancelled', productId });
    } else if (result.status === 'failed') {
      this.setFlow({ status: 'failed', productId, message: result.message });
    } else {
      await this.handleTransaction(result.transaction);
    }
  }

  async restore(): Promise<void> {
    if (isFlowBusy(this.flow)) return;
    this.setFlow({ status: 'restoring' });

    const transactions = await this.store.restorePurchases();
    if (transactions.length === 0) {
      this.setFlow({ status: 'nothingToRestore' });
      return;
    }
    this.setFlow({ status: 'idle' });
    for (const transaction of transactions) {
      this.settled.delete(transaction.id);
      await this.handleTransaction(transaction);
    }
  }

  dismissOutcome(): void {
    if (!isFlowBusy(this.flow)) this.setFlow({ status: 'idle' });
  }

  async refreshEntitlement(): Promise<void> {
    try {
      this.setEntitlement(await this.api.getEntitlement());
    } catch (error) {
      if (!(error instanceof TransportError)) throw error;
    }
  }

  /** Every delivery path (purchase result, update stream, restore, relaunch) ends up here. */
  handleTransaction(transaction: StoreTransaction): Promise<void> {
    if (this.settled.has(transaction.id) || this.awaitingConfirmation.has(transaction.id)) {
      return Promise.resolve();
    }
    const existing = this.inFlight.get(transaction.id);
    if (existing) return existing;

    const task = this.verify(transaction).finally(() => this.inFlight.delete(transaction.id));
    this.inFlight.set(transaction.id, task);
    return task;
  }

  private get flow(): PurchaseFlow {
    return this.state.getState().flow;
  }

  private async resume(): Promise<void> {
    await this.refreshEntitlement();
    const unfinished = await this.store.unfinishedTransactions();
    for (const transaction of unfinished) {
      this.awaitingConfirmation.delete(transaction.id);
      await this.handleTransaction(transaction);
    }
  }

  private async verify(transaction: StoreTransaction): Promise<void> {
    const { productId } = transaction;
    this.setFlow({ status: 'verifying', productId });
    try {
      const response = await this.api.verifyPurchase({ transactionId: transaction.id, productId });
      this.setEntitlement(response.entitlement);

      if (response.status === 'pending') {
        this.awaitingConfirmation.set(transaction.id, transaction);
        this.setFlow({ status: 'pendingConfirmation', productId, isOffline: false });
        this.schedulePoll();
        return;
      }

      this.awaitingConfirmation.delete(transaction.id);
      this.settled.add(transaction.id);
      await this.store.finishTransaction(transaction.id);
      this.setFlow({ status: 'confirmed', productId });
    } catch (error) {
      if (!(error instanceof TransportError)) {
        this.setFlow({ status: 'failed', productId, message: 'We could not confirm your access.' });
        return;
      }
      this.setFlow({ status: 'pendingConfirmation', productId, isOffline: true });
    }
  }

  private schedulePoll(): void {
    if (this.pollTimer || this.isStopped) return;
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      void this.pollPending();
    }, this.pollIntervalMs);
  }

  private async pollPending(): Promise<void> {
    const pending = [...this.awaitingConfirmation.values()];
    this.awaitingConfirmation.clear();
    for (const transaction of pending) await this.handleTransaction(transaction);
  }

  private setEntitlement(entitlement: Entitlement): void {
    if (this.isStopped) return;
    this.cache.write(entitlement);
    this.state.setState({ entitlement });
  }

  private setFlow(flow: PurchaseFlow): void {
    if (!this.isStopped) this.state.setState({ flow });
  }
}
