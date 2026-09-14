import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { styles } from './ControlSection.styles';

export function ControlSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}
