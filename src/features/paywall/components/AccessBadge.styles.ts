import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { radii, sizes, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.iconButton,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: sizes.hairline,
  },
  activePill: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  activeLabel: { ...typography.captionStrong, color: colors.accent },
  pendingPill: { backgroundColor: colors.warningSoft, borderColor: colors.warningSoft },
  pendingLabel: { ...typography.captionStrong, color: colors.warning },
  upgradePill: { backgroundColor: colors.accent, borderColor: colors.accent },
  upgradeLabel: { ...typography.captionStrong, color: colors.textInverse },
  pressed: { opacity: 0.8 },
});
