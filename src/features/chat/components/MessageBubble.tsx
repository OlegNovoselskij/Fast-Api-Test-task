import { memo } from 'react';
import { Text, View } from 'react-native';

import type { DeliveryStatus } from '../types';
import { DeliveryStatusLabel } from './DeliveryStatusLabel';
import { styles } from './MessageBubble.styles';

type Props = {
  text: string;
  time: string;
  isOwn: boolean;
  accessibilityLabel: string;
  statusKind?: DeliveryStatus['kind'];
};

export const MessageBubble = memo(function MessageBubble({
  text,
  time,
  isOwn,
  accessibilityLabel,
  statusKind,
}: Props) {
  return (
    <View
      style={[styles.row, isOwn ? styles.rowOwn : styles.rowIncoming]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {!isOwn && (
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>ES</Text>
        </View>
      )}
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleIncoming]}>
        <Text style={styles.text}>{text}</Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{time}</Text>
          {statusKind && <DeliveryStatusLabel kind={statusKind} />}
        </View>
      </View>
    </View>
  );
});
