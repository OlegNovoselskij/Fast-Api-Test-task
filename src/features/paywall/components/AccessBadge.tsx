import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { colors } from '@/shared/theme/colors';
import { sizes } from '@/shared/theme/sizes';

import type { AccessState } from '../services/accessService';
import { styles } from './AccessBadge.styles';

type Props = AccessState & { onPress: () => void };

export function AccessBadge({ entitlement, flow, onPress }: Props) {
  if (entitlement?.isActive) {
    return (
      <Animated.View entering={FadeIn} key="active">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fan in All Access. Manage subscription"
          onPress={onPress}
          style={[styles.pill, styles.activePill]}
          testID="access-badge"
        >
          <Ionicons name="star" size={sizes.iconSm} color={colors.accent} />
          <Text style={styles.activeLabel}>Fan in All Access</Text>
        </Pressable>
      </Animated.View>
    );
  }

  if (flow.status === 'pendingConfirmation' || flow.status === 'verifying') {
    return (
      <Animated.View entering={FadeIn} key="pending">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Payment received, confirming access"
          onPress={onPress}
          style={[styles.pill, styles.pendingPill]}
          testID="access-badge"
        >
          <ActivityIndicator size="small" color={colors.warning} />
          <Text style={styles.pendingLabel}>Confirming access</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn} key="upgrade">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Get All Access"
        onPress={onPress}
        style={({ pressed }) => [styles.pill, styles.upgradePill, pressed && styles.pressed]}
        testID="access-badge"
      >
        <Ionicons name="star-outline" size={sizes.iconSm} color={colors.textInverse} />
        <Text style={styles.upgradeLabel}>Get All Access</Text>
      </Pressable>
    </Animated.View>
  );
}
