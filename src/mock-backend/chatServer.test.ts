import { createTestDatabaseHost } from '@/shared/db/testing/nodeSqliteDriver';

import { createChatApi } from './chatApi';
import { ChatServer } from './chatServer';
import { TransportError } from './errors';
import { generateHistory } from './history';
import { MockNetwork } from './mockNetwork';

const setup = async (historySize = 120) => {
  const host = createTestDatabaseHost();
  const db = await host.open('backend');
  const server = await ChatServer.open(db, { historySize });
  const network = new MockNetwork({ latencyMs: () => 0 });
  return { host, db, server, network, api: createChatApi(network, server) };
};

describe('ChatServer', () => {
  it('generates the same history on every install', () => {
    const first = [...generateHistory(200, 7)];
    const second = [...generateHistory(200, 7)];
    expect(second).toEqual(first);
  });

  it('pages backwards through history in server order without gaps', async () => {
    const { api } = await setup(120);

    const latest = await api.getLatest(50);
    const older = await api.getBefore(latest.messages[0]!.seq, 50);
    const oldest = await api.getBefore(older.messages[0]!.seq, 50);

    const seqs = [...oldest.messages, ...older.messages, ...latest.messages].map((m) => m.seq);
    expect(seqs).toEqual(Array.from({ length: 120 }, (_, index) => index + 1));
    expect(latest.hasMore).toBe(true);
    expect(oldest.hasMore).toBe(false);
  });

  it('keeps accepted messages when the backend is reopened', async () => {
    const { host, api } = await setup(10);
    await api.sendMessage({ clientId: 'c-1', text: 'hello' });

    const reopened = await ChatServer.open(await host.open('backend'), { historySize: 10 });
    const page = await reopened.getAfter(10, 10);

    expect(page.messages.map((m) => m.text)).toEqual(['hello']);
  });

  it('commits a send whose response is lost', async () => {
    const { api, server, network } = await setup(0);
    network.setFault('loseNextSendResponse', true);

    await expect(api.sendMessage({ clientId: 'c-1', text: 'hello' })).rejects.toBeInstanceOf(
      TransportError,
    );

    expect((await server.getLatest(10)).messages).toHaveLength(1);
  });

  it('returns the stored message when the same client ID is sent again', async () => {
    const { api, server } = await setup(0);

    const first = await api.sendMessage({ clientId: 'c-1', text: 'hello' });
    const retry = await api.sendMessage({ clientId: 'c-1', text: 'hello' });

    expect(retry).toEqual(first);
    expect((await server.getLatest(10)).messages).toHaveLength(1);
  });

  it('rejects requests while offline without reaching the server', async () => {
    const { api, server, network } = await setup(0);
    network.setOnline(false);

    await expect(api.sendMessage({ clientId: 'c-1', text: 'hello' })).rejects.toMatchObject({
      reason: 'offline',
    });

    expect((await server.getLatest(10)).messages).toHaveLength(0);
  });
});
