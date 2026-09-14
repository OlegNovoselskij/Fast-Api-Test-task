import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { colors } from '@/shared/theme/colors';
import { sizes } from '@/shared/theme/sizes';

import type { DeliveryStatus } from '../types';
import { styles } from './DeliveryStatusLabel.styles';

type Kind = DeliveryStatus['kind'];

const APPEARANCE: Record<Kind, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  sent: { icon: 'checkmark-done', color: colors.textSecondary },
  sending: { icon: 'arrow-up-circle-outline', color: colors.textSecondary },
  waitingForNetwork: { icon: 'time-outline', color: colors.warning },
  retrying: { icon: 'refresh', color: colors.warning },
  failed: { icon: 'alert-circle', color: colors.danger },
};

export const DELIVERY_LABELS: Record<Kind, string> = {
  sent: 'Sent',
  sending: 'Sending…',
  waitingForNetwork: 'Waiting for network',
  retrying: 'Not confirmed yet · retrying',
  failed: 'Not sent',
};

export const DeliveryStatusLabel = memo(function DeliveryStatusLabel({ kind }: { kind: Kind }) {
  const { icon, color } = APPEARANCE[kind];
  return (
    <Animated.View key={kind} entering={FadeIn} style={styles.container}>
      <Ionicons name={icon} size={sizes.iconSm} color={color} />
      {kind !== 'sent' && <Text style={[styles.label, { color }]}>{DELIVERY_LABELS[kind]}</Text>}
    </Animated.View>
  );
});
