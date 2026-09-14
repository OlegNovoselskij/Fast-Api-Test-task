import type { TextStyle } from 'react-native';

import { colors } from './colors';

export const typography = {
  title: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.textPrimary },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400', color: colors.textPrimary },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.textPrimary },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400', color: colors.textSecondary },
  captionStrong: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.textSecondary },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
} satisfies Record<string, TextStyle>;
