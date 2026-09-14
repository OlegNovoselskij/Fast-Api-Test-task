import { createBillingApi } from '@/mock-backend/billingApi';
import { BillingServer } from '@/mock-backend/billingServer';
import type { Entitlement } from '@/mock-backend/billingServer';
import { MockNetwork } from '@/mock-backend/mockNetwork';
import { MockStore } from '@/mock-store/mockStore';
import { createTestDatabaseHost } from '@/shared/db/testing/nodeSqliteDriver';

import { AccessService } from '../services/accessService';

export async function createAccessHarness() {
  const host = createTestDatabaseHost();
  const network = new MockNetwork({ latencyMs: () => 0 });
  let transactionCounter = 0;
  let cached: Entitlement | null = null;

  const billing = await BillingServer.open(await host.open('backend'));
  const store = await MockStore.open(await host.open('store'), {
    createId: () => `tx-${++transactionCounter}`,
    sheetDelayMs: 0,
  });
  const verifySpy = jest.spyOn(billing, 'verifyPurchase');

  const boot = async () => {
    const access = new AccessService({
      store,
      api: createBillingApi(network, billing),
      connectivity: network,
      cache: { read: () => cached, write: (entitlement) => (cached = entitlement) },
    });
    await access.start();
    return access;
  };

  let access = await boot();

  return {
    network,
    billing,
    store,
    verifySpy,
    get access() {
      return access;
    },
    get state() {
      return access.state.getState();
    },
    async relaunch() {
      access.stop();
      access = await boot();
    },
  };
}
