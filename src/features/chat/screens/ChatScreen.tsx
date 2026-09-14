import { useMemo, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/shared/theme/colors';

import { ChatHeader } from '../components/ChatHeader';
import { Composer } from '../components/Composer';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { MessageList } from '../components/MessageList';
import { QuotaLabel } from '../components/QuotaLabel';
import { useChat } from '../hooks/useChat';
import type { ChatSyncEngine } from '../services/chatSyncEngine';
import { styles } from './ChatScreen.styles';

type Props = {
  engine: ChatSyncEngine;
  headerAccessory?: ReactNode;
  onOpenControls: () => void;
  onUpgrade: () => void;
};

export function ChatScreen({ engine, headerAccessory, onOpenControls, onUpgrade }: Props) {
  const { listRef, state, items, waitingCount, send, retry, discard, loadOlder } = useChat(engine);
  const quotaLabel = useMemo(() => <QuotaLabel quota={state.quota} />, [state.quota]);

  return (
    <View style={styles.container}>
      <ChatHeader accessory={headerAccessory} onOpenControls={onOpenControls} />
      <ConnectionBanner isOnline={state.isOnline} waitingCount={waitingCount} />
      <View style={styles.list}>
        {state.isReady ? (
          <MessageList
            listRef={listRef}
            items={items}
            hasOlder={state.hasOlder}
            isLoadingOlder={state.isLoadingOlder}
            olderUnavailableOffline={state.olderUnavailableOffline}
            onLoadOlder={loadOlder}
            isOnline={state.isOnline}
            sendingClientId={state.sendingClientId}
            onRetry={retry}
            onDiscard={discard}
            onUpgrade={onUpgrade}
          />
        ) : (
          <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
        )}
      </View>
      <Composer onSend={send} footerAccessory={quotaLabel} />
    </View>
  );
}
