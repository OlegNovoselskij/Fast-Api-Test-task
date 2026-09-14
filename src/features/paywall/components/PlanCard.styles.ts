import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { radii, sizes, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: sizes.minTouchTarget + spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.bubbleOutgoing,
  },
  disabled: { opacity: 0.6 },
  copy: { flex: 1, gap: spacing.xxs },
  title: typography.bodyStrong,
  note: { ...typography.caption, color: colors.success },
  price: typography.bodyStrong,
  period: typography.caption,
  currentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  currentLabel: { ...typography.captionStrong, color: colors.accent },
});
