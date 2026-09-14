import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
  },
  copy: { flex: 1, gap: spacing.xs },
  title: typography.bodyStrong,
  body: typography.caption,
  progress: { backgroundColor: colors.accentSoft },
  info: { backgroundColor: colors.surface },
  success: { backgroundColor: colors.successSoft },
  warning: { backgroundColor: colors.warningSoft },
  danger: { backgroundColor: colors.dangerSoft },
  progressText: { color: colors.accent },
  infoText: { color: colors.textPrimary },
  successText: { color: colors.success },
  warningText: { color: colors.warning },
  dangerText: { color: colors.danger },
});
