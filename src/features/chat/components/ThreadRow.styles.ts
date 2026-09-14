import { StyleSheet } from 'react-native';

import { spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  day: { alignItems: 'center', paddingVertical: spacing.md },
  dayLabel: typography.caption,
});
