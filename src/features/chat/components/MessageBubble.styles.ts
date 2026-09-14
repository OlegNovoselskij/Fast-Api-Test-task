import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { radii, sizes, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  rowOwn: { justifyContent: 'flex-end', paddingLeft: spacing.xxl + spacing.lg },
  rowIncoming: { justifyContent: 'flex-start', paddingRight: spacing.xxl + spacing.lg },
  avatar: {
    width: sizes.avatarXs,
    height: sizes.avatarXs,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  avatarLabel: { ...typography.captionStrong, color: colors.accent },
  bubble: {
    flexShrink: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  bubbleOwn: { backgroundColor: colors.bubbleOutgoing },
  bubbleIncoming: { backgroundColor: colors.bubbleIncoming },
  text: typography.body,
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  time: typography.caption,
});
