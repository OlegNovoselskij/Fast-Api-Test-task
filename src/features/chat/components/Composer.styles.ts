import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { radii, sizes, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: sizes.hairline,
    borderTopColor: colors.border,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: sizes.minTouchTarget,
    maxHeight: sizes.composerMaxHeight,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radii.sm,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  sendButton: {
    width: sizes.minTouchTarget,
    height: sizes.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonPressed: { backgroundColor: colors.accentPressed },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: typography.caption,
});
