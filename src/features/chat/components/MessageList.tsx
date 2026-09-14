import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list';
import { forwardRef, useCallback, type Ref } from 'react';
import { ActivityIndicator, Text, View, type ScrollViewProps } from 'react-native';
import { KeyboardChatScrollView } from 'react-native-keyboard-controller';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/shared/theme/colors';

import type { ThreadItem } from '../types';
import { styles } from './MessageList.styles';
import { ThreadRow, type ThreadRowContext } from './ThreadRow';

const ChatScrollView = forwardRef(function ChatScrollView(
  props: ScrollViewProps,
  ref: Ref<unknown>,
) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardChatScrollView
      // @ts-expect-error reason: FlashList passes an untyped ref for its scroll component
      ref={ref}
      {...props}
      offset={insets.bottom}
    />
  );
});

type Props = ThreadRowContext & {
  listRef: Ref<FlashListRef<ThreadItem>>;
  items: ThreadItem[];
  hasOlder: boolean;
  isLoadingOlder: boolean;
  olderUnavailableOffline: boolean;
  onLoadOlder: () => void;
};

const keyExtractor = (item: ThreadItem) => item.key;
const getItemType = (item: ThreadItem) =>
  item.type === 'message' ? `message-${item.message.author}` : item.type;

export function MessageList({
  listRef,
  items,
  hasOlder,
  isLoadingOlder,
  olderUnavailableOffline,
  onLoadOlder,
  isOnline,
  sendingClientId,
  onRetry,
  onDiscard,
}: Props) {
  const reduceMotion = useReducedMotion();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ThreadItem>) => (
      <ThreadRow
        item={item}
        isOnline={item.type === 'outgoing' ? isOnline : true}
        sendingClientId={item.type === 'outgoing' ? sendingClientId : null}
        onRetry={onRetry}
        onDiscard={onDiscard}
      />
    ),
    [isOnline, sendingClientId, onRetry, onDiscard],
  );

  return (
    <FlashList
      ref={listRef}
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      renderScrollComponent={ChatScrollView}
      maintainVisibleContentPosition={{
        startRenderingFromBottom: true,
        autoscrollToBottomThreshold: 0.2,
        animateAutoScrollToBottom: !reduceMotion,
      }}
      onStartReached={onLoadOlder}
      onStartReachedThreshold={0.5}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <ListHeader
          hasOlder={hasOlder}
          isLoading={isLoadingOlder}
          unavailableOffline={olderUnavailableOffline}
          isEmpty={items.length === 0}
        />
      }
      testID="message-list"
    />
  );
}

type HeaderProps = {
  hasOlder: boolean;
  isLoading: boolean;
  unavailableOffline: boolean;
  isEmpty: boolean;
};

function ListHeader({ hasOlder, isLoading, unavailableOffline, isEmpty }: HeaderProps) {
  if (isLoading) {
    return (
      <View style={styles.header}>
        <ActivityIndicator
          color={colors.textSecondary}
          accessibilityLabel="Loading older messages"
        />
      </View>
    );
  }
  if (unavailableOffline) {
    return (
      <View style={styles.header}>
        <Text style={styles.headerText}>Connect to load older messages.</Text>
      </View>
    );
  }
  if (isEmpty) {
    return (
      <View style={styles.header}>
        <Text style={styles.headerText}>No messages yet. Say hi to Ethan!</Text>
      </View>
    );
  }
  if (!hasOlder) {
    return (
      <View style={styles.header}>
        <Text style={styles.headerText}>This is the beginning of your conversation.</Text>
      </View>
    );
  }
  return null;
}
