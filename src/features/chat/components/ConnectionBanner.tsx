import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { colors } from '@/shared/theme/colors';
import { sizes } from '@/shared/theme/sizes';

import { styles } from './ConnectionBanner.styles';

type Props = { isOnline: boolean; waitingCount: number };

export function ConnectionBanner({ isOnline, waitingCount }: Props) {
  if (isOnline) return null;

  const detail =
    waitingCount === 0
      ? 'New messages will be saved and sent when you reconnect.'
      : `${waitingCount} ${waitingCount === 1 ? 'message is' : 'messages are'} saved and will send when you reconnect.`;

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name="cloud-offline-outline" size={sizes.icon} color={colors.warning} />
      <Text style={styles.text}>
        <Text style={styles.title}>You’re offline. </Text>
        {detail}
      </Text>
    </Animated.View>
  );
}
