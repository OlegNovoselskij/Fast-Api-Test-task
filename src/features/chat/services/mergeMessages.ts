import type { ServerMessage } from '../types';

/** Merges by server seq so repeated or overlapping responses never add copies. */
export function mergeMessages(
  current: ServerMessage[],
  incoming: ServerMessage[],
): ServerMessage[] {
  if (incoming.length === 0) return current;

  const first = current[0];
  const last = current[current.length - 1];
  if (first && last && isStrictlyAscending(incoming)) {
    if (incoming[0]!.seq > last.seq) return current.concat(incoming);
    if (incoming[incoming.length - 1]!.seq < first.seq) return incoming.concat(current);
  }

  const bySeq = new Map<number, ServerMessage>();
  for (const message of current) bySeq.set(message.seq, message);
  for (const message of incoming) bySeq.set(message.seq, message);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

function isStrictlyAscending(messages: ServerMessage[]): boolean {
  for (let index = 1; index < messages.length; index += 1) {
    if (messages[index]!.seq <= messages[index - 1]!.seq) return false;
  }
  return true;
}
