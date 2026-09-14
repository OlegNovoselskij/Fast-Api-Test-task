import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { radii, sizes, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  title: typography.title,
  body: { ...typography.body, textAlign: 'center' },
  hint: { ...typography.caption, textAlign: 'center' },
  button: {
    minHeight: sizes.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
  },
  buttonLabel: { ...typography.button, color: colors.textInverse },
});
