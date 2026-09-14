import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { sizes, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: sizes.minTouchTarget + spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  copy: { flex: 1, gap: spacing.xxs },
  label: typography.body,
  action: { ...typography.bodyStrong, color: colors.accent },
  destructive: { color: colors.danger },
  description: typography.caption,
  pressed: { backgroundColor: colors.surface },
  disabled: { opacity: 0.4 },
});
