import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/shared/theme/colors';

import { styles } from './BootScreen.styles';

type Props = { error: unknown; onRetry: () => void };

export function BootScreen({ error, onRetry }: Props) {
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Couldn’t open local data</Text>
        <Text style={styles.body}>{String(error)}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.body}>Preparing chat history…</Text>
      <Text style={styles.hint}>First launch generates 50,000 messages in the mock backend.</Text>
    </View>
  );
}
