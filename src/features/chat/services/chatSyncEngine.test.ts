import { FREE_MESSAGE_LIMIT } from '@/mock-backend/chatServer';

import { createChatHarness } from '../testing/chatHarness';

describe('ChatSyncEngine', () => {
  it('persists an offline send before showing it as waiting', async () => {
    const chat = await createChatHarness();
    chat.network.setOnline(false);

    await chat.engine.send('first');

    const [persisted] = await chat.local.listOutbox();
    expect(persisted).toMatchObject({ text: 'first', status: 'queued' });
    expect(chat.engine.store.getState().outbox).toEqual([persisted]);
  });

  it('recovers queued sends and missed incoming messages after an app restart', async () => {
    const chat = await createChatHarness({ historySize: 5 });
    chat.network.setOnline(false);
    await chat.engine.send('one');
    await chat.engine.send('two');
    await chat.engine.send('three');
    const queuedIds = chat.engine.store.getState().outbox.map((e) => e.clientId);

    await chat.relaunch();

    const afterRestart = chat.engine.store.getState().outbox;
    expect(afterRestart.map((e) => [e.clientId, e.text, e.status])).toEqual([
      [queuedIds[0], 'one', 'queued'],
      [queuedIds[1], 'two', 'queued'],
      [queuedIds[2], 'three', 'queued'],
    ]);

    await chat.server.deliverIncoming(4);
    chat.network.setOnline(true);
    await chat.engine.sync();

    const state = chat.engine.store.getState();
    expect(state.outbox).toEqual([]);
    expect(state.messages.slice(-7).map((m) => m.author)).toEqual([
      'creator',
      'creator',
      'creator',
      'creator',
      'fan',
      'fan',
      'fan',
    ]);
    expect(state.messages.slice(-3).map((m) => m.text)).toEqual(['one', 'two', 'three']);
    expect((await chat.serverTexts()).slice(-3)).toEqual(['one', 'two', 'three']);
    expect(await chat.serverTexts()).toHaveLength(5 + 4 + 3);
  });

  it('keeps queued messages in local order until each is confirmed', async () => {
    const chat = await createChatHarness();
    chat.network.setOnline(false);
    await chat.engine.send('a');
    await chat.engine.send('b');
    await chat.engine.send('c');

    chat.network.setOnline(true);
    await chat.engine.sync();

    expect(await chat.serverTexts()).toEqual(['a', 'b', 'c']);
  });

  it('does not skip messages that arrive between catching up and a send response', async () => {
    const chat = await createChatHarness();
    const originalSend = chat.server.sendMessage.bind(chat.server);
    jest.spyOn(chat.server, 'sendMessage').mockImplementationOnce(async (request) => {
      await chat.server.deliverIncoming(1);
      return originalSend(request);
    });

    await chat.engine.send('mine');
    await chat.engine.sync();
    await chat.relaunch();

    expect(chat.threadTexts()).toHaveLength(2);
    expect(chat.engine.store.getState().messages.map((m) => m.author)).toEqual(['creator', 'fan']);
  });

  it('does not add copies when the same messages are received again', async () => {
    const chat = await createChatHarness({ historySize: 3 });
    await chat.engine.sync();
    const before = chat.engine.store.getState().messages;

    const page = await chat.server.getLatest(3);
    await chat.local.commitConfirmed(page.messages, [], 0);
    await chat.engine.sync();

    expect(chat.engine.store.getState().messages.map((m) => m.seq)).toEqual(
      before.map((m) => m.seq),
    );
  });

  it('explains a send blocked by the free limit and sends it once access is granted', async () => {
    let isPaid = false;
    const chat = await createChatHarness({ hasPaidAccess: async () => isPaid });
    for (let index = 0; index < FREE_MESSAGE_LIMIT; index += 1) {
      await chat.engine.send(`free ${index}`);
    }
    await chat.engine.sync();

    await chat.engine.send('over the limit');
    await chat.engine.send('also blocked');
    await chat.engine.sync();

    const state = chat.engine.store.getState();
    expect(state.quota).toEqual({ isUnlimited: false, remaining: 0 });
    expect(
      state.outbox.map((e) => [e.text, e.status, e.error?.code, e.error?.isRetryable]),
    ).toEqual([
      ['over the limit', 'failed', 'QUOTA_EXCEEDED', false],
      ['also blocked', 'failed', 'QUOTA_EXCEEDED', false],
    ]);

    isPaid = true;
    await chat.engine.onPaidAccessChanged();
    await chat.engine.sync();

    expect(chat.engine.store.getState().outbox).toEqual([]);
    expect((await chat.serverTexts()).slice(-2)).toEqual(['over the limit', 'also blocked']);
    expect(chat.engine.store.getState().quota).toEqual({ isUnlimited: true });
  });

  describe('lost responses', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('keeps one copy when a send whose response was lost is retried', async () => {
      const chat = await createChatHarness();
      chat.network.setFault('loseNextSendResponse', true);

      await chat.engine.send('hello');
      await chat.engine.sync();
      expect(chat.engine.store.getState().outbox).toHaveLength(1);

      await jest.advanceTimersByTimeAsync(2_000);
      await chat.engine.sync();

      expect(chat.threadTexts()).toEqual(['hello']);
      expect(await chat.serverTexts()).toEqual(['hello']);
    });

    it('confirms a pending send from caught-up messages instead of sending it again', async () => {
      const chat = await createChatHarness();
      const sendSpy = jest.spyOn(chat.server, 'sendMessage');
      chat.network.setFault('loseNextSendResponse', true);

      await chat.engine.send('hello');
      await chat.engine.sync();
      await jest.advanceTimersByTimeAsync(2_000);
      await chat.engine.sync();

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(chat.engine.store.getState().outbox).toEqual([]);
      expect(chat.threadTexts()).toEqual(['hello']);
    });
  });

  describe('server errors', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('retries a temporary server error automatically', async () => {
      const chat = await createChatHarness();
      chat.network.setFault('failNextSendWithServerError', true);

      await chat.engine.send('hello');
      await chat.engine.sync();
      expect(chat.engine.store.getState().outbox[0]).toMatchObject({
        status: 'queued',
        attempts: 1,
      });

      await jest.advanceTimersByTimeAsync(2_000);
      await chat.engine.sync();

      expect(chat.engine.store.getState().outbox).toEqual([]);
      expect(await chat.serverTexts()).toEqual(['hello']);
    });

    it('marks a send failed after repeated server errors and keeps its text for retry', async () => {
      const chat = await createChatHarness();
      const sendSpy = jest.spyOn(chat.server, 'sendMessage');
      const failSend = () => chat.network.setFault('failNextSendWithServerError', true);

      failSend();
      await chat.engine.send('keep me');
      await chat.engine.sync();
      failSend();
      await jest.advanceTimersByTimeAsync(2_000);
      await chat.engine.sync();
      failSend();
      await jest.advanceTimersByTimeAsync(4_000);
      await chat.engine.sync();

      const [failed] = chat.engine.store.getState().outbox;
      expect(failed).toMatchObject({
        text: 'keep me',
        status: 'failed',
        error: { code: 'SERVER_UNAVAILABLE', isRetryable: true },
      });
      expect(sendSpy).not.toHaveBeenCalled();

      await chat.engine.retry(failed!.clientId);
      await chat.engine.sync();
      expect(await chat.serverTexts()).toEqual(['keep me']);
    });
  });
});
