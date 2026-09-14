import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/shared/theme/colors';
import { sizes } from '@/shared/theme/sizes';

import { styles } from './ChatHeader.styles';

type Props = { accessory?: ReactNode; onOpenControls: () => void };

export function ChatHeader({ accessory, onOpenControls }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          Chat with
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open simulation controls"
          hitSlop={8}
          onPress={onOpenControls}
          style={styles.iconButton}
          testID="open-controls"
        >
          <Ionicons name="ellipsis-vertical" size={sizes.icon} color={colors.textPrimary} />
        </Pressable>
      </View>
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>ES</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            Ethan Shoots
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            @ethan_shoots
          </Text>
        </View>
        {accessory}
      </View>
    </View>
  );
}
