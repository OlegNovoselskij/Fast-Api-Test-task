import { Pressable, Switch, Text, View } from 'react-native';

import { colors } from '@/shared/theme/colors';

import { styles } from './ControlRow.styles';

type SwitchProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
};

export function SwitchRow({ label, description, value, onValueChange, testID }: SwitchProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent }}
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

type ActionProps = {
  label: string;
  description?: string;
  onPress: () => void;
  isDestructive?: boolean;
  isDisabled?: boolean;
  testID?: string;
};

export function ActionRow({
  label,
  description,
  onPress,
  isDestructive,
  isDisabled,
  testID,
}: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      testID={testID}
    >
      <View style={styles.copy}>
        <Text style={[styles.label, styles.action, isDestructive && styles.destructive]}>
          {label}
        </Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
    </Pressable>
  );
}
