import { memo } from 'react';
import { Text, View } from 'react-native';

import { formatTime, getDeliveryStatus } from '../services/threadItems';
import type { ThreadItem } from '../types';
import { DELIVERY_LABELS } from './DeliveryStatusLabel';
import { FailedSendActions } from './FailedSendActions';
import { MessageBubble } from './MessageBubble';
import { styles } from './ThreadRow.styles';

export type ThreadRowContext = {
  isOnline: boolean;
  sendingClientId: string | null;
  onRetry: (clientId: string) => void;
  onDiscard: (clientId: string) => void;
};

type Props = { item: ThreadItem } & ThreadRowContext;

export const ThreadRow = memo(function ThreadRow({
  item,
  isOnline,
  sendingClientId,
  onRetry,
  onDiscard,
}: Props) {
  if (item.type === 'day') {
    return (
      <View style={styles.day} accessibilityRole="header">
        <Text style={styles.dayLabel}>{item.label}</Text>
      </View>
    );
  }

  if (item.type === 'message') {
    const { message } = item;
    const isOwn = message.author === 'fan';
    const time = formatTime(message.createdAt);
    return (
      <View>
        <MessageBubble
          text={message.text}
          time={time}
          isOwn={isOwn}
          accessibilityLabel={`${isOwn ? 'You' : 'Ethan'}: ${message.text}. ${time}`}
          statusKind={isOwn ? 'sent' : undefined}
        />
      </View>
    );
  }

  const { entry } = item;
  const status = getDeliveryStatus(entry, { isOnline, sendingClientId });
  const time = formatTime(entry.createdAt);
  return (
    <View>
      <MessageBubble
        text={entry.text}
        time={time}
        isOwn
        accessibilityLabel={`You: ${entry.text}. ${DELIVERY_LABELS[status.kind]}`}
        statusKind={status.kind}
      />
      {status.kind === 'failed' && (
        <FailedSendActions
          clientId={entry.clientId}
          error={status.error}
          onRetry={onRetry}
          onDiscard={onDiscard}
        />
      )}
    </View>
  );
});
