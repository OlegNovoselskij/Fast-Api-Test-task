import type { ChatServer, MessagePage, SendMessageRequest, ServerMessage } from './chatServer';
import type { MockNetwork } from './mockNetwork';

/** What the app sees of the chat backend: every call goes through the simulated network. */
export interface ChatApi {
  sendMessage(request: SendMessageRequest): Promise<ServerMessage>;
  getLatest(limit: number): Promise<MessagePage>;
  getBefore(beforeSeq: number, limit: number): Promise<MessagePage>;
  getAfter(afterSeq: number, limit: number): Promise<MessagePage>;
}

export function createChatApi(network: MockNetwork, server: ChatServer): ChatApi {
  return {
    sendMessage: (request) => network.request('chat.send', () => server.sendMessage(request)),
    getLatest: (limit) => network.request('chat.read', () => server.getLatest(limit)),
    getBefore: (beforeSeq, limit) =>
      network.request('chat.read', () => server.getBefore(beforeSeq, limit)),
    getAfter: (afterSeq, limit) =>
      network.request('chat.read', () => server.getAfter(afterSeq, limit)),
  };
}
