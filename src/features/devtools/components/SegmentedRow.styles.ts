import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { radii, sizes, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  row: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  label: typography.body,
  description: typography.caption,
  segments: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    padding: spacing.xxs,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  segment: {
    flex: 1,
    minHeight: sizes.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm - spacing.xxs,
  },
  segmentSelected: { backgroundColor: colors.background },
  segmentLabel: { ...typography.captionStrong, color: colors.textSecondary },
  segmentLabelSelected: { color: colors.textPrimary },
});
