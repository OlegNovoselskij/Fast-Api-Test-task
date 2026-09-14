import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warningSoft,
  },
  text: { ...typography.caption, flex: 1, color: colors.warning },
  title: { ...typography.captionStrong, color: colors.warning },
});
