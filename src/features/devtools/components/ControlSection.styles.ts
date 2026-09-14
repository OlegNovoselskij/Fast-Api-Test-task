import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { radii, sizes, spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  title: { ...typography.captionStrong, paddingHorizontal: spacing.lg, textTransform: 'uppercase' },
  card: {
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
});
