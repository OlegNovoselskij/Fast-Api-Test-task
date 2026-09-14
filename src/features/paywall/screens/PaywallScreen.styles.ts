import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { radii, sizes, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.xl, padding: spacing.lg },
  simulatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.warningSoft,
  },
  simulatedLabel: { ...typography.captionStrong, color: colors.warning },
  hero: { alignItems: 'center', gap: spacing.md },
  avatar: {
    width: sizes.minTouchTarget + spacing.lg,
    height: sizes.minTouchTarget + spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  title: { ...typography.title, textAlign: 'center' },
  benefits: { alignSelf: 'stretch', gap: spacing.sm },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitLabel: { ...typography.body, flex: 1 },
  plans: { gap: spacing.sm },
  actions: { gap: spacing.xs },
  primary: {
    minHeight: sizes.minTouchTarget + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
  },
  primaryDisabled: { opacity: 0.45 },
  primaryPressed: { backgroundColor: colors.accentPressed },
  primaryLabel: { ...typography.button, color: colors.textInverse },
  secondary: {
    minHeight: sizes.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { ...typography.bodyStrong, color: colors.accent },
  secondaryDisabled: { opacity: 0.45 },
  legal: { ...typography.caption, textAlign: 'center' },
});
