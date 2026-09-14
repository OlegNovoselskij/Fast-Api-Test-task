import { createStore, type StoreApi } from 'zustand/vanilla';

import type { ChatApi } from '@/mock-backend/chatApi';
import { MAX_MESSAGE_LENGTH, type MessageQuota } from '@/mock-backend/chatServer';
import { ApiError, TransportError } from '@/mock-backend/errors';

import type { ChatLocalStore } from '../data/chatLocalStore';
import type { OutboxEntry, SendError, ServerMessage } from '../types';
import { mergeMessages } from './mergeMessages';

export const PAGE_SIZE = 50;
const CATCH_UP_PAGE_SIZE = 200;
const MAX_SERVER_ERROR_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 30_000;

export type ChatState = {
  isReady: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  messages: ServerMessage[];
  outbox: OutboxEntry[];
  sendingClientId: string | null;
  hasOlder: boolean;
  isLoadingOlder: boolean;
  olderUnavailableOffline: boolean;
  /** Last quota the server reported; `null` until known. */
  quota: MessageQuota | null;
};

export type Connectivity = {
  readonly isOnline: boolean;
  onConnectivityChange(listener: (isOnline: boolean) => void): () => void;
};

type Dependencies = {
  api: ChatApi;
  local: ChatLocalStore;
  connectivity: Connectivity;
  createClientId: () => string;
  now?: () => number;
};

export class ChatSyncEngine {
  readonly store: StoreApi<ChatState>;

  private readonly api: ChatApi;
  private readonly local: ChatLocalStore;
  private readonly connectivity: Connectivity;
  private readonly createClientId: () => string;
  private readonly now: () => number;

  private running: Promise<void> | null = null;
  private rerunRequested = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelayMs = BASE_RETRY_DELAY_MS;
  private unsubscribe: (() => void) | null = null;
  private isStopped = false;

  constructor({ api, local, connectivity, createClientId, now = Date.now }: Dependencies) {
    this.api = api;
    this.local = local;
    this.connectivity = connectivity;
    this.createClientId = createClientId;
    this.now = now;
    this.store = createStore<ChatState>(() => ({
      isReady: false,
      isOnline: connectivity.isOnline,
      isSyncing: false,
      messages: [],
      outbox: [],
      sendingClientId: null,
      hasOlder: false,
      isLoadingOlder: false,
      olderUnavailableOffline: false,
      quota: null,
    }));
  }

  async start(): Promise<void> {
    const [outbox, messages] = await Promise.all([
      this.local.listOutbox(),
      this.local.latestMessages(PAGE_SIZE),
    ]);
    this.setState({
      isReady: true,
      outbox,
      messages,
      hasOlder: (messages[0]?.seq ?? 1) > 1,
    });

    this.unsubscribe = this.connectivity.onConnectivityChange((isOnline) => {
      this.setState({ isOnline, olderUnavailableOffline: false });
      if (isOnline) {
        this.retryDelayMs = BASE_RETRY_DELAY_MS;
        void this.sync();
      } else {
        this.clearRetryTimer();
      }
    });

    await this.sync();
  }

  stop(): void {
    this.isStopped = true;
    this.unsubscribe?.();
    this.clearRetryTimer();
  }

  /** Persists the message before it is shown as queued, so a force-quit can never lose it. */
  async send(rawText: string): Promise<void> {
    const text = rawText.trim();
    if (text.length === 0 || text.length > MAX_MESSAGE_LENGTH) return;

    const entry = await this.local.enqueue(this.createClientId(), text, this.now());
    this.setState({ outbox: [...this.state.outbox, entry] });
    void this.sync();
  }

  async retry(clientId: string): Promise<void> {
    await this.requeue([clientId]);
  }

  async requeueFailed(code: SendError['code']): Promise<void> {
    const ids = this.state.outbox.filter((e) => e.error?.code === code).map((e) => e.clientId);
    await this.requeue(ids);
  }

  async discard(clientId: string): Promise<void> {
    const entry = this.state.outbox.find((e) => e.clientId === clientId);
    if (entry?.status !== 'failed') return;
    await this.local.discard(clientId);
    this.setState({ outbox: this.state.outbox.filter((e) => e.clientId !== clientId) });
  }

  /** Called when paid access changes: refresh the quota and resend what the limit blocked. */
  async onPaidAccessChanged(): Promise<void> {
    await this.requeueFailed('QUOTA_EXCEEDED');
    void this.sync();
  }

  sync(): Promise<void> {
    if (this.running) {
      this.rerunRequested = true;
      return this.running;
    }
    this.running = (async () => {
      this.setState({ isSyncing: true });
      try {
        do {
          this.rerunRequested = false;
          await this.syncOnce();
        } while (this.rerunRequested && !this.isStopped);
      } finally {
        this.running = null;
        this.setState({ isSyncing: false, sendingClientId: null });
      }
    })();
    return this.running;
  }

  async loadOlder(): Promise<void> {
    const { isLoadingOlder, hasOlder, messages } = this.state;
    const oldest = messages[0];
    if (isLoadingOlder || !hasOlder || !oldest) return;

    this.setState({ isLoadingOlder: true, olderUnavailableOffline: false });
    try {
      let older = await this.local.messagesBefore(oldest.seq, PAGE_SIZE);
      const expected = Math.min(PAGE_SIZE, oldest.seq - 1);
      if (older.length < expected) {
        const lowestKnown = older[0]?.seq ?? oldest.seq;
        const page = await this.api.getBefore(lowestKnown, expected - older.length);
        await this.local.commitConfirmed(page.messages, []);
        older = page.messages.concat(older);
      }
      const merged = mergeMessages(this.state.messages, older);
      this.setState({ messages: merged, hasOlder: (merged[0]?.seq ?? 1) > 1 });
    } catch (error) {
      if (!(error instanceof TransportError)) throw error;
      this.setState({ olderUnavailableOffline: true });
    } finally {
      this.setState({ isLoadingOlder: false });
    }
  }

  private get state(): ChatState {
    return this.store.getState();
  }

  private setState(partial: Partial<ChatState>): void {
    if (!this.isStopped) this.store.setState(partial);
  }

  private async syncOnce(): Promise<void> {
    if (!this.connectivity.isOnline || this.isStopped || this.retryTimer) return;
    try {
      await this.pullNewMessages();
      await this.flushOutbox();
      this.setState({ quota: await this.api.getQuota() });
      this.retryDelayMs = BASE_RETRY_DELAY_MS;
    } catch (error) {
      if (this.isStopped) return;
      if (!(error instanceof TransportError)) console.error('Chat sync failed', error);
      this.scheduleRetry();
    }
  }

  /**
   * Catches up from the gap-free cursor, not from the newest cached seq: a send response can
   * land above messages that other people posted in between, and those must still be fetched.
   */
  private async pullNewMessages(): Promise<void> {
    const cursor = await this.local.getSyncedThroughSeq();
    if (cursor === null) {
      const page = await this.api.getLatest(PAGE_SIZE);
      const last = page.messages[page.messages.length - 1];
      await this.applyConfirmed(page.messages, [], last?.seq ?? 0);
      this.setState({ hasOlder: page.hasMore });
      return;
    }

    let after = cursor;
    let hasMore = true;
    while (hasMore && !this.isStopped) {
      const page = await this.api.getAfter(after, CATCH_UP_PAGE_SIZE);
      after = page.messages[page.messages.length - 1]?.seq ?? after;
      await this.applyConfirmed(page.messages, [], after);
      hasMore = page.hasMore;
    }
  }

  /** Sends one message at a time in local order so the server sees them in the order typed. */
  private async flushOutbox(): Promise<void> {
    for (;;) {
      const next = this.state.outbox.find((entry) => entry.status === 'queued');
      if (!next || !this.connectivity.isOnline || this.isStopped) return;

      this.setState({ sendingClientId: next.clientId });
      try {
        const message = await this.api.sendMessage({ clientId: next.clientId, text: next.text });
        await this.applyConfirmed([message], [next.clientId]);
      } catch (error) {
        const shouldStop = await this.handleSendFailure(next, error);
        if (shouldStop) return;
      } finally {
        this.setState({ sendingClientId: null });
      }
    }
  }

  /** Returns true when the flush loop must pause until a retry or reconnect. */
  private async handleSendFailure(entry: OutboxEntry, error: unknown): Promise<boolean> {
    if (error instanceof TransportError) {
      await this.local.recordAttempt(entry.clientId);
      this.patchEntry(entry.clientId, { attempts: entry.attempts + 1 });
      throw error;
    }

    const sendError = toSendError(error);
    if (sendError.isRetryable && entry.attempts + 1 < MAX_SERVER_ERROR_ATTEMPTS) {
      await this.local.recordAttempt(entry.clientId);
      this.patchEntry(entry.clientId, { attempts: entry.attempts + 1 });
      this.scheduleRetry();
      return true;
    }

    await this.local.markFailed(entry.clientId, sendError);
    this.patchEntry(entry.clientId, { status: 'failed', error: sendError });
    return false;
  }

  private async applyConfirmed(
    messages: ServerMessage[],
    confirmedClientIds: string[],
    syncedThroughSeq?: number,
  ): Promise<void> {
    const pendingIds = new Set(this.state.outbox.map((e) => e.clientId));
    const resolved = new Set(confirmedClientIds);
    for (const message of messages) {
      if (message.clientId && pendingIds.has(message.clientId)) resolved.add(message.clientId);
    }

    await this.local.commitConfirmed(messages, [...resolved], syncedThroughSeq);
    this.setState({
      messages: mergeMessages(this.state.messages, messages),
      outbox:
        resolved.size === 0
          ? this.state.outbox
          : this.state.outbox.filter((e) => !resolved.has(e.clientId)),
    });
  }

  private async requeue(clientIds: string[]): Promise<void> {
    if (clientIds.length === 0) return;
    await this.local.requeue(clientIds);
    const ids = new Set(clientIds);
    this.setState({
      outbox: this.state.outbox.map((e) =>
        ids.has(e.clientId) ? { ...e, status: 'queued', attempts: 0, error: null } : e,
      ),
    });
    void this.sync();
  }

  private patchEntry(clientId: string, patch: Partial<OutboxEntry>): void {
    this.setState({
      outbox: this.state.outbox.map((e) => (e.clientId === clientId ? { ...e, ...patch } : e)),
    });
  }

  private scheduleRetry(): void {
    if (this.retryTimer || this.isStopped || !this.connectivity.isOnline) return;
    const delay = this.retryDelayMs;
    this.retryDelayMs = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.sync();
    }, delay);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }
}

function toSendError(error: unknown): SendError {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message, isRetryable: error.isRetryable };
  }
  return { code: 'UNKNOWN', message: 'Something went wrong while sending.', isRetryable: true };
}
