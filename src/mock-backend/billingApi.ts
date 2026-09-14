import type {
  BillingServer,
  Entitlement,
  VerifyPurchaseRequest,
  VerifyPurchaseResponse,
} from './billingServer';
import type { MockNetwork } from './mockNetwork';

export interface BillingApi {
  verifyPurchase(request: VerifyPurchaseRequest): Promise<VerifyPurchaseResponse>;
  getEntitlement(): Promise<Entitlement>;
}

export function createBillingApi(network: MockNetwork, server: BillingServer): BillingApi {
  return {
    verifyPurchase: (request) => network.request('billing', () => server.verifyPurchase(request)),
    getEntitlement: () => network.request('billing', () => server.getEntitlement()),
  };
}
