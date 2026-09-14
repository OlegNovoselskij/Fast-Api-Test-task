import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_MESSAGE_LENGTH } from '@/mock-backend/chatServer';
import { colors } from '@/shared/theme/colors';
import { sizes, spacing } from '@/shared/theme/sizes';

import { styles } from './Composer.styles';

type Props = { onSend: (text: string) => void; footerAccessory?: ReactNode };

export const Composer = memo(function Composer({ onSend, footerAccessory }: Props) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text);
    setText('');
  };

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message Ethan"
            placeholderTextColor={colors.textSecondary}
            maxLength={MAX_MESSAGE_LENGTH}
            multiline
            style={styles.input}
            accessibilityLabel="Message"
            testID="composer-input"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
            testID="composer-send"
          >
            <Ionicons name="send" size={sizes.icon} color={colors.textInverse} />
          </Pressable>
        </View>
        <View style={styles.footer}>
          <Text style={styles.counter} accessibilityLabel={`${text.length} of 400 characters`}>
            {text.length}/{MAX_MESSAGE_LENGTH}
          </Text>
          {footerAccessory}
        </View>
      </View>
    </KeyboardStickyView>
  );
});
