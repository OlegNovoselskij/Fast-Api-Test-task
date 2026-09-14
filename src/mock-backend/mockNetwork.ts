import { createStore } from 'zustand/vanilla';

import { ApiError, TransportError } from './errors';

export type RequestKind = 'chat.send' | 'chat.read' | 'billing';

export type NetworkState = {
  isOnline: boolean;
  loseNextSendResponse: boolean;
  failNextSendWithServerError: boolean;
};

type Options = { latencyMs?: () => number };

const defaultLatency = () => 250 + Math.random() * 250;

const wait = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/**
 * Simulated transport between the app and the mock backend. Responses are JSON round-tripped
 * so the client can never share object references with server state.
 */
export class MockNetwork {
  readonly state = createStore<NetworkState>(() => ({
    isOnline: true,
    loseNextSendResponse: false,
    failNextSendWithServerError: false,
  }));

  private readonly latencyMs: () => number;

  constructor({ latencyMs = defaultLatency }: Options = {}) {
    this.latencyMs = latencyMs;
  }

  get isOnline(): boolean {
    return this.state.getState().isOnline;
  }

  setOnline(isOnline: boolean): void {
    this.state.setState({ isOnline });
  }

  setFault(fault: 'loseNextSendResponse' | 'failNextSendWithServerError', enabled: boolean): void {
    this.state.setState({ [fault]: enabled });
  }

  onConnectivityChange(listener: (isOnline: boolean) => void): () => void {
    return this.state.subscribe((next, previous) => {
      if (next.isOnline !== previous.isOnline) listener(next.isOnline);
    });
  }

  async request<T>(kind: RequestKind, handler: () => Promise<T>): Promise<T> {
    if (!this.isOnline) throw new TransportError('offline');
    await wait(this.latencyMs());
    if (!this.isOnline) throw new TransportError('offline');

    if (kind === 'chat.send' && this.consume('failNextSendWithServerError')) {
      throw new ApiError(503, 'SERVER_UNAVAILABLE', 'The server is temporarily unavailable.');
    }

    const result = await handler();

    await wait(this.latencyMs());
    if (!this.isOnline) throw new TransportError('timeout');
    if (kind === 'chat.send' && this.consume('loseNextSendResponse')) {
      throw new TransportError('timeout');
    }

    return JSON.parse(JSON.stringify(result)) as T;
  }

  private consume(fault: 'loseNextSendResponse' | 'failNextSendWithServerError'): boolean {
    if (!this.state.getState()[fault]) return false;
    this.state.setState({ [fault]: false });
    return true;
  }
}
