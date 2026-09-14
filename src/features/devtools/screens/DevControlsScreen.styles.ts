import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/sizes';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceMuted },
  content: { gap: spacing.xl, padding: spacing.lg },
  intro: { ...typography.caption, paddingHorizontal: spacing.lg },
});
