import { randomUUID } from 'expo-crypto';
import Storage from 'expo-sqlite/kv-store';

import { ChatLocalStore, ChatSyncEngine } from '@/features/chat';
import { createChatApi } from '@/mock-backend/chatApi';
import { ChatServer } from '@/mock-backend/chatServer';
import { MockNetwork } from '@/mock-backend/mockNetwork';
import { deleteExpoDatabase, openExpoDatabase } from '@/shared/db/expoSqliteDriver';
import type { SqlDatabase } from '@/shared/db/sqlDatabase';

const BACKEND_DB = 'mock-backend.db';
const CLIENT_DB = 'chat-client.db';
/** Simulated airplane mode must survive a force-quit, like the real one does. */
const SIMULATED_ONLINE_KEY = 'simulatedOnline';

export type AppServices = {
  network: MockNetwork;
  chatServer: ChatServer;
  chat: ChatSyncEngine;
  dispose(): Promise<void>;
};

export async function createAppServices(): Promise<AppServices> {
  const databases: SqlDatabase[] = [];
  const open = async (name: string) => {
    const db = await openExpoDatabase(name);
    databases.push(db);
    return db;
  };

  const network = new MockNetwork({
    isOnline: Storage.getItemSync(SIMULATED_ONLINE_KEY) !== 'false',
  });
  network.onConnectivityChange((isOnline) =>
    Storage.setItemSync(SIMULATED_ONLINE_KEY, String(isOnline)),
  );
  const chatServer = await ChatServer.open(await open(BACKEND_DB));
  const chat = new ChatSyncEngine({
    api: createChatApi(network, chatServer),
    local: await ChatLocalStore.open(await open(CLIENT_DB)),
    connectivity: network,
    createClientId: randomUUID,
  });
  void chat.start();

  let disposal: Promise<void> | null = null;
  return {
    network,
    chatServer,
    chat,
    dispose() {
      disposal ??= (async () => {
        chat.stop();
        await Promise.all(databases.map((db) => db.close()));
      })();
      return disposal;
    },
  };
}

export async function deleteAppData(): Promise<void> {
  Storage.removeItemSync(SIMULATED_ONLINE_KEY);
  await Promise.all([BACKEND_DB, CLIENT_DB].map(deleteExpoDatabase));
}
