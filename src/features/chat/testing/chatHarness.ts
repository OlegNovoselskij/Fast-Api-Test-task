import { createChatApi } from '@/mock-backend/chatApi';
import { ChatServer } from '@/mock-backend/chatServer';
import { MockNetwork } from '@/mock-backend/mockNetwork';
import { createTestDatabaseHost } from '@/shared/db/testing/nodeSqliteDriver';

import { ChatLocalStore } from '../data/chatLocalStore';
import { ChatSyncEngine } from '../services/chatSyncEngine';

/**
 * Wires the real engine, local store and mock backend over in-memory SQLite. `relaunch()`
 * drops every live object (like a force-quit) and boots again from what was persisted.
 */
export async function createChatHarness({
  historySize = 0,
  hasPaidAccess,
}: {
  historySize?: number;
  hasPaidAccess?: () => Promise<boolean>;
} = {}) {
  const host = createTestDatabaseHost();
  const network = new MockNetwork({ latencyMs: () => 0 });
  let clientIdCounter = 0;

  const server = await ChatServer.open(await host.open('backend'), { historySize, hasPaidAccess });

  const boot = async () => {
    const local = await ChatLocalStore.open(await host.open('client'));
    const engine = new ChatSyncEngine({
      api: createChatApi(network, server),
      local,
      connectivity: network,
      createClientId: () => `client-${++clientIdCounter}`,
    });
    await engine.start();
    return { engine, local };
  };

  let current = await boot();

  return {
    network,
    server,
    get engine() {
      return current.engine;
    },
    get local() {
      return current.local;
    },
    async relaunch() {
      current.engine.stop();
      current = await boot();
    },
    async serverTexts() {
      const page = await server.getLatest(1_000);
      return page.messages.map((m) => m.text);
    },
    threadTexts() {
      const { messages, outbox } = current.engine.store.getState();
      return [...messages.map((m) => m.text), ...outbox.map((e) => e.text)];
    },
  };
}
