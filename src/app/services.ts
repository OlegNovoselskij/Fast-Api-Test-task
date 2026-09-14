import { randomUUID } from 'expo-crypto';
import Storage from 'expo-sqlite/kv-store';

import { ChatLocalStore, ChatSyncEngine } from '@/features/chat';
import { AccessService } from '@/features/paywall';
import { createBillingApi } from '@/mock-backend/billingApi';
import { BillingServer, type Entitlement } from '@/mock-backend/billingServer';
import { createChatApi } from '@/mock-backend/chatApi';
import { ChatServer } from '@/mock-backend/chatServer';
import { MockNetwork } from '@/mock-backend/mockNetwork';
import { MockStore } from '@/mock-store/mockStore';
import { deleteExpoDatabase, openExpoDatabase } from '@/shared/db/expoSqliteDriver';
import type { SqlDatabase } from '@/shared/db/sqlDatabase';

const BACKEND_DB = 'mock-backend.db';
const CLIENT_DB = 'chat-client.db';
const STORE_DB = 'mock-store.db';
/** Simulated airplane mode must survive a force-quit, like the real one does. */
const SIMULATED_ONLINE_KEY = 'simulatedOnline';
const ENTITLEMENT_CACHE_KEY = 'lastConfirmedEntitlement';

export type AppServices = {
  network: MockNetwork;
  chatServer: ChatServer;
  billingServer: BillingServer;
  store: MockStore;
  chat: ChatSyncEngine;
  access: AccessService;
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
  const unsubscribeNetwork = network.onConnectivityChange((isOnline) =>
    Storage.setItemSync(SIMULATED_ONLINE_KEY, String(isOnline)),
  );

  const backendDb = await open(BACKEND_DB);
  const billingServer = await BillingServer.open(backendDb);
  const chatServer = await ChatServer.open(backendDb, {
    hasPaidAccess: () => billingServer.hasPaidAccess(),
  });
  const store = await MockStore.open(await open(STORE_DB), { createId: randomUUID });

  const chat = new ChatSyncEngine({
    api: createChatApi(network, chatServer),
    local: await ChatLocalStore.open(await open(CLIENT_DB)),
    connectivity: network,
    createClientId: randomUUID,
  });
  const access = new AccessService({
    store,
    api: createBillingApi(network, billingServer),
    connectivity: network,
    cache: {
      read: () => parseEntitlement(Storage.getItemSync(ENTITLEMENT_CACHE_KEY)),
      write: (entitlement) =>
        Storage.setItemSync(ENTITLEMENT_CACHE_KEY, JSON.stringify(entitlement)),
    },
  });

  const unsubscribeAccess = access.state.subscribe((next, previous) => {
    if (next.entitlement?.isActive !== previous.entitlement?.isActive) {
      void chat.onPaidAccessChanged();
    }
  });

  void chat.start();
  void access.start();

  let disposal: Promise<void> | null = null;
  return {
    network,
    chatServer,
    billingServer,
    store,
    chat,
    access,
    dispose() {
      disposal ??= (async () => {
        unsubscribeNetwork();
        unsubscribeAccess();
        chat.stop();
        access.stop();
        await Promise.all(databases.map((db) => db.close()));
      })();
      return disposal;
    },
  };
}

export async function deleteAppData(): Promise<void> {
  Storage.removeItemSync(SIMULATED_ONLINE_KEY);
  Storage.removeItemSync(ENTITLEMENT_CACHE_KEY);
  await Promise.all([BACKEND_DB, CLIENT_DB, STORE_DB].map(deleteExpoDatabase));
}

function parseEntitlement(raw: string | null): Entitlement | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === 'object' && value !== null && 'isActive' in value) {
      return value as Entitlement;
    }
  } catch {
    return null;
  }
  return null;
}
