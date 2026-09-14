import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { PRODUCTS, type ProductId } from '@/mock-store/mockStore';
import { colors } from '@/shared/theme/colors';
import { sizes } from '@/shared/theme/sizes';

import { PlanCard } from '../components/PlanCard';
import { PurchaseStatusPanel } from '../components/PurchaseStatusPanel';
import { isFlowBusy, type AccessService } from '../services/accessService';
import { styles } from './PaywallScreen.styles';

const BENEFITS = [
  'Unlimited messages with Ethan',
  'Your messages are never capped mid-conversation',
  'Cancel anytime from your store account',
];

export function PaywallScreen({ access }: { access: AccessService }) {
  const insets = useSafeAreaInsets();
  const { entitlement, flow } = useStore(access.state);
  const currentProductId = entitlement?.isActive ? entitlement.productId : null;
  const [selected, setSelected] = useState<ProductId>(
    currentProductId === 'all_access_monthly' ? 'all_access_yearly' : 'all_access_monthly',
  );

  const isBusy = isFlowBusy(flow);
  const product = PRODUCTS.find((p) => p.id === selected)!;
  const isSelectedCurrent = selected === currentProductId;
  const primaryLabel = isBusy
    ? 'Processing…'
    : isSelectedCurrent
      ? 'Current plan'
      : `${currentProductId ? 'Switch to' : 'Subscribe for'} ${product.price}/${product.period}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + sizes.minTouchTarget },
      ]}
    >
      <View style={styles.simulatedBadge} accessibilityRole="text">
        <Ionicons name="flask-outline" size={sizes.iconSm} color={colors.warning} />
        <Text style={styles.simulatedLabel}>Simulated billing · no real payment is made</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Ionicons name="star" size={sizes.icon} color={colors.accent} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          All Access to Ethan Shoots
        </Text>
        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefit}>
              <Ionicons name="checkmark" size={sizes.icon} color={colors.accent} />
              <Text style={styles.benefitLabel}>{benefit}</Text>
            </View>
          ))}
        </View>
      </View>

      <Animated.View layout={LinearTransition} style={styles.plans} accessibilityRole="radiogroup">
        {PRODUCTS.map((item) => (
          <PlanCard
            key={item.id}
            product={item}
            isSelected={selected === item.id}
            isCurrent={currentProductId === item.id}
            note={item.id === 'all_access_yearly' ? 'Save 33% vs monthly' : undefined}
            isDisabled={isBusy}
            onSelect={() => {
              setSelected(item.id);
              access.dismissOutcome();
            }}
          />
        ))}
      </Animated.View>

      <Animated.View layout={LinearTransition}>
        <PurchaseStatusPanel flow={flow} entitlement={entitlement} />
      </Animated.View>

      <Animated.View layout={LinearTransition} style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy || isSelectedCurrent, busy: isBusy }}
          disabled={isBusy || isSelectedCurrent}
          onPress={() => void access.purchase(selected)}
          style={({ pressed }) => [
            styles.primary,
            (isBusy || isSelectedCurrent) && styles.primaryDisabled,
            pressed && styles.primaryPressed,
          ]}
          testID="purchase"
        >
          <Text style={styles.primaryLabel}>{primaryLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy }}
          disabled={isBusy}
          onPress={() => void access.restore()}
          style={styles.secondary}
          testID="restore"
        >
          <Text style={[styles.secondaryLabel, isBusy && styles.secondaryDisabled]}>
            Restore purchases
          </Text>
        </Pressable>
      </Animated.View>

      <Text style={styles.legal}>
        In the real app, payment is charged to your App Store or Google Play account and the
        subscription renews automatically unless cancelled at least 24 hours before the period ends.
      </Text>
    </ScrollView>
  );
}
