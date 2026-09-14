import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { radii, sizes, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  container: { gap: spacing.sm, alignItems: 'flex-end', paddingHorizontal: spacing.lg },
  message: { ...typography.caption, color: colors.danger, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  button: {
    minHeight: sizes.minTouchTarget,
    minWidth: sizes.minTouchTarget * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  pressed: { opacity: 0.7 },
  primaryLabel: { ...typography.bodyStrong, color: colors.textInverse },
  secondaryLabel: typography.bodyStrong,
});
