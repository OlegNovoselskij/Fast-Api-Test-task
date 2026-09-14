import type { FlashListRef } from '@shopify/flash-list';
import { useCallback, useMemo, useRef } from 'react';
import { useStore } from 'zustand';

import type { ChatSyncEngine } from '../services/chatSyncEngine';
import { buildThreadItems } from '../services/threadItems';
import type { ThreadItem } from '../types';

export function useChat(engine: ChatSyncEngine) {
  const listRef = useRef<FlashListRef<ThreadItem>>(null);
  const state = useStore(engine.store);

  const items = useMemo(
    () => buildThreadItems(state.messages, state.outbox),
    [state.messages, state.outbox],
  );

  const waitingCount = useMemo(
    () => state.outbox.filter((entry) => entry.status === 'queued').length,
    [state.outbox],
  );

  const send = useCallback(
    (text: string) => {
      void engine.send(text).then(() => listRef.current?.scrollToEnd({ animated: true }));
    },
    [engine],
  );
  const retry = useCallback((clientId: string) => void engine.retry(clientId), [engine]);
  const discard = useCallback((clientId: string) => void engine.discard(clientId), [engine]);
  const loadOlder = useCallback(() => void engine.loadOlder(), [engine]);

  return { listRef, state, items, waitingCount, send, retry, discard, loadOlder };
}
