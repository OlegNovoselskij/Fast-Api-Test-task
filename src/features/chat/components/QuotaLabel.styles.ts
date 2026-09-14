import { StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { typography } from '@/shared/theme/typography';

export const styles = StyleSheet.create({
  label: typography.caption,
  accent: { ...typography.caption, color: colors.accent },
  danger: { ...typography.captionStrong, color: colors.danger },
});
