import type { ServerMessage } from '@/mock-backend/chatServer';

export type { ServerMessage };

export type SendErrorCode = 'SERVER_UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'INVALID_REQUEST' | 'UNKNOWN';

export type SendError = {
  code: SendErrorCode;
  message: string;
  isRetryable: boolean;
};

export type OutboxEntry = {
  clientId: string;
  localOrder: number;
  text: string;
  createdAt: number;
  status: 'queued' | 'failed';
  attempts: number;
  error: SendError | null;
};

export type DeliveryStatus =
  | { kind: 'waitingForNetwork' }
  | { kind: 'sending' }
  | { kind: 'retrying'; attempts: number }
  | { kind: 'failed'; error: SendError }
  | { kind: 'sent' };

export type ThreadItem =
  | { type: 'day'; key: string; label: string }
  | { type: 'message'; key: string; message: ServerMessage }
  | { type: 'outgoing'; key: string; entry: OutboxEntry };
