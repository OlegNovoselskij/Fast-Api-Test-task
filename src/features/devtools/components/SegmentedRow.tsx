import { Pressable, Text, View } from 'react-native';

import { styles } from './SegmentedRow.styles';

type Props<T extends string> = {
  label: string;
  description?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
};

export function SegmentedRow<T extends string>({
  label,
  description,
  options,
  value,
  onChange,
  testID,
}: Props<T>) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      <View style={styles.segments} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => onChange(option.value)}
              style={[styles.segment, isSelected && styles.segmentSelected]}
              testID={testID ? `${testID}-${option.value}` : undefined}
            >
              <Text style={[styles.segmentLabel, isSelected && styles.segmentLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
