import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import type { Product } from '@/mock-store/mockStore';
import { colors } from '@/shared/theme/colors';
import { sizes } from '@/shared/theme/sizes';

import { styles } from './PlanCard.styles';

type Props = {
  product: Product;
  isSelected: boolean;
  isCurrent: boolean;
  note?: string;
  isDisabled: boolean;
  onSelect: () => void;
};

export function PlanCard({ product, isSelected, isCurrent, note, isDisabled, onSelect }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, disabled: isDisabled }}
      accessibilityLabel={`${product.title}, ${product.price} per ${product.period}${isCurrent ? ', current plan' : ''}`}
      disabled={isDisabled}
      onPress={onSelect}
      style={[styles.card, isSelected && styles.cardSelected, isDisabled && styles.disabled]}
      testID={`plan-${product.id}`}
    >
      <Ionicons
        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
        size={sizes.icon}
        color={isSelected ? colors.accent : colors.borderStrong}
      />
      <View style={styles.copy}>
        <Text style={styles.title}>{product.title}</Text>
        {note && <Text style={styles.note}>{note}</Text>}
      </View>
      {isCurrent ? (
        <View style={styles.currentBadge}>
          <Text style={styles.currentLabel}>Current plan</Text>
        </View>
      ) : (
        <Text style={styles.price}>
          {product.price}
          <Text style={styles.period}>/{product.period}</Text>
        </Text>
      )}
    </Pressable>
  );
}
