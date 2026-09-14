import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { radii, sizes, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: sizes.hairline,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.minTouchTarget,
  },
  title: typography.bodyStrong,
  iconButton: {
    width: sizes.minTouchTarget,
    height: sizes.minTouchTarget,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  avatarLabel: { ...typography.captionStrong, color: colors.accent },
  identity: { flex: 1 },
  name: typography.bodyStrong,
  handle: { ...typography.caption, color: colors.accent },
});
