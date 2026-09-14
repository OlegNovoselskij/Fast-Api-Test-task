import type { DeliveryStatus, OutboxEntry, ServerMessage, ThreadItem } from '../types';

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export const formatTime = (timestamp: number) => timeFormatter.format(timestamp).toLowerCase();

const dayKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export function formatDay(timestamp: number, now = Date.now()): string {
  const key = dayKey(timestamp);
  if (key === dayKey(now)) return 'Today';
  if (key === dayKey(now - 86_400_000)) return 'Yesterday';
  return dayFormatter.format(timestamp);
}

/**
 * Confirmed messages in server order, then the outbox in local order. Outgoing messages are
 * keyed by client ID in both states so confirmation re-renders a row instead of remounting it.
 */
export function buildThreadItems(
  messages: ServerMessage[],
  outbox: OutboxEntry[],
  now = Date.now(),
): ThreadItem[] {
  const items: ThreadItem[] = [];
  const usedKeys = new Set<string>();
  let previousDay: string | null = null;

  const pushDay = (timestamp: number) => {
    const key = dayKey(timestamp);
    if (key === previousDay) return;
    previousDay = key;
    items.push({ type: 'day', key: `day-${key}`, label: formatDay(timestamp, now) });
  };

  for (const message of messages) {
    pushDay(message.createdAt);
    const key = message.clientId && !usedKeys.has(message.clientId) ? message.clientId : message.id;
    usedKeys.add(key);
    items.push({ type: 'message', key, message });
  }
  for (const entry of outbox) {
    pushDay(entry.createdAt);
    items.push({ type: 'outgoing', key: entry.clientId, entry });
  }
  return items;
}

export function getDeliveryStatus(
  entry: OutboxEntry,
  { isOnline, sendingClientId }: { isOnline: boolean; sendingClientId: string | null },
): DeliveryStatus {
  if (entry.status === 'failed' && entry.error) return { kind: 'failed', error: entry.error };
  if (sendingClientId === entry.clientId) return { kind: 'sending' };
  if (!isOnline) return { kind: 'waitingForNetwork' };
  if (entry.attempts > 0) return { kind: 'retrying', attempts: entry.attempts };
  return { kind: 'sending' };
}
