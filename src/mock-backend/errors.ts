export type TransportFailure = 'offline' | 'timeout';

/** The request may or may not have reached the server; the caller cannot know which. */
export class TransportError extends Error {
  constructor(readonly reason: TransportFailure) {
    super(reason === 'offline' ? 'No connection' : 'The server did not respond in time');
    this.name = 'TransportError';
  }
}

export type ApiErrorCode = 'SERVER_UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'INVALID_REQUEST';

/** The server received the request and answered with a definitive error. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isRetryable(): boolean {
    return this.status >= 500;
  }
}
