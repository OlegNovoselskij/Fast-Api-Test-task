import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { SendError } from '../types';
import { styles } from './FailedSendActions.styles';

type Props = {
  clientId: string;
  error: SendError;
  onRetry: (clientId: string) => void;
  onDiscard: (clientId: string) => void;
};

export const FailedSendActions = memo(function FailedSendActions({
  clientId,
  error,
  onRetry,
  onDiscard,
}: Props) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Text style={styles.message}>{error.message}</Text>
      <View style={styles.actions}>
        {error.isRetryable && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry sending this message"
            onPress={() => onRetry(clientId)}
            style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryLabel}>Retry</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete this unsent message"
          onPress={() => onDiscard(clientId)}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryLabel}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
});
