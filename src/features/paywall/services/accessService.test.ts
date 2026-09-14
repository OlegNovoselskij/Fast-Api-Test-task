import { createAccessHarness } from '../testing/accessHarness';

describe('AccessService', () => {
  beforeEach(() => jest.useFakeTimers({ now: Date.UTC(2026, 8, 14) }));
  afterEach(() => jest.useRealTimers());

  it('grants access only after delayed backend confirmation', async () => {
    const paywall = await createAccessHarness();
    paywall.billing.settings.setState({ confirmationMode: 'delayed' });

    await paywall.access.purchase('all_access_monthly');

    expect(paywall.state.flow).toMatchObject({ status: 'pendingConfirmation', isOffline: false });
    expect(paywall.state.entitlement).toEqual({ isActive: false });
    expect(await paywall.store.unfinishedTransactions()).toHaveLength(1);

    await jest.advanceTimersByTimeAsync(8_000);

    expect(paywall.state.flow).toEqual({ status: 'confirmed', productId: 'all_access_monthly' });
    expect(paywall.state.entitlement).toMatchObject({
      isActive: true,
      productId: 'all_access_monthly',
    });
    expect(await paywall.store.unfinishedTransactions()).toEqual([]);
  });

  it('keeps a pending purchase across a relaunch and confirms it later', async () => {
    const paywall = await createAccessHarness();
    paywall.billing.settings.setState({ confirmationMode: 'manual' });
    await paywall.access.purchase('all_access_monthly');

    await paywall.relaunch();
    expect(paywall.state.flow.status).toBe('pendingConfirmation');
    expect(paywall.state.entitlement).toEqual({ isActive: false });

    await paywall.billing.confirmPendingNow();
    await jest.advanceTimersByTimeAsync(2_000);

    expect(paywall.state.entitlement).toMatchObject({ isActive: true });
  });

  it('ignores repeated taps while a purchase is in progress', async () => {
    const paywall = await createAccessHarness();
    const purchaseSpy = jest.spyOn(paywall.store, 'purchase');

    await Promise.all([
      paywall.access.purchase('all_access_monthly'),
      paywall.access.purchase('all_access_monthly'),
      paywall.access.purchase('all_access_yearly'),
    ]);

    expect(purchaseSpy).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate effects when the store delivers the same transaction again', async () => {
    const paywall = await createAccessHarness();
    await paywall.access.purchase('all_access_monthly');
    const confirmed = paywall.state.entitlement;
    const verifyCalls = paywall.verifySpy.mock.calls.length;

    paywall.store.replayLastTransaction();
    paywall.store.replayLastTransaction();
    await jest.advanceTimersByTimeAsync(0);

    expect(paywall.verifySpy).toHaveBeenCalledTimes(verifyCalls);
    expect(paywall.state.entitlement).toEqual(confirmed);
  });

  it('keeps existing access when an unrelated purchase attempt fails', async () => {
    const paywall = await createAccessHarness();
    await paywall.access.purchase('all_access_monthly');
    const active = paywall.state.entitlement;

    paywall.store.settings.setState({ nextOutcome: 'fail' });
    await paywall.access.purchase('all_access_yearly');

    expect(paywall.state.flow).toMatchObject({ status: 'failed', productId: 'all_access_yearly' });
    expect(paywall.state.entitlement).toEqual(active);
  });

  it('reports a cancelled purchase without contacting the backend', async () => {
    const paywall = await createAccessHarness();
    paywall.store.settings.setState({ nextOutcome: 'cancel' });

    await paywall.access.purchase('all_access_monthly');

    expect(paywall.state.flow).toEqual({ status: 'cancelled', productId: 'all_access_monthly' });
    expect(paywall.verifySpy).not.toHaveBeenCalled();
  });

  it('restores an existing purchase the backend no longer links to this device', async () => {
    const paywall = await createAccessHarness();
    await paywall.access.purchase('all_access_yearly');
    await paywall.billing.forgetPurchases();
    await paywall.relaunch();
    expect(paywall.state.entitlement).toEqual({ isActive: false });

    await paywall.access.restore();

    expect(paywall.state.entitlement).toMatchObject({
      isActive: true,
      productId: 'all_access_yearly',
    });
  });

  it('finishes verification after reconnecting when the purchase completed offline', async () => {
    const paywall = await createAccessHarness();
    paywall.network.setOnline(false);

    await paywall.access.purchase('all_access_monthly');
    expect(paywall.state.flow).toMatchObject({ status: 'pendingConfirmation', isOffline: true });

    paywall.network.setOnline(true);
    await jest.advanceTimersByTimeAsync(0);

    expect(paywall.state.entitlement).toMatchObject({ isActive: true });
  });
});
