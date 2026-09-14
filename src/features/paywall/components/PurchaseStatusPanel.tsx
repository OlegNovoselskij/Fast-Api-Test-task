import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { Entitlement } from '@/mock-backend/billingServer';
import { colors } from '@/shared/theme/colors';
import { sizes } from '@/shared/theme/sizes';

import type { PurchaseFlow } from '../services/accessService';
import { styles } from './PurchaseStatusPanel.styles';

type Tone = 'progress' | 'info' | 'success' | 'warning' | 'danger';

type Copy = { tone: Tone; title: string; body?: string };

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

function describe(flow: PurchaseFlow, entitlement: Entitlement | null): Copy | null {
  const activeUntil = entitlement?.isActive ? dateFormatter.format(entitlement.expiresAt) : null;
  switch (flow.status) {
    case 'idle':
      return activeUntil
        ? { tone: 'success', title: 'All Access is active', body: `Renews on ${activeUntil}.` }
        : null;
    case 'purchasing':
      return { tone: 'progress', title: 'Waiting for the store…' };
    case 'restoring':
      return { tone: 'progress', title: 'Checking your store account…' };
    case 'verifying':
      return { tone: 'progress', title: 'Payment received. Confirming your access…' };
    case 'pendingConfirmation':
      return flow.isOffline
        ? {
            tone: 'warning',
            title: 'Payment received, access not confirmed yet',
            body: 'You’re offline. We’ll confirm with FanSuite as soon as you reconnect. You won’t be charged again.',
          }
        : {
            tone: 'warning',
            title: 'Payment received, access not confirmed yet',
            body: 'FanSuite is still confirming this purchase. Access starts as soon as it does. You won’t be charged again.',
          };
    case 'confirmed':
      return activeUntil
        ? {
            tone: 'success',
            title: 'You’re in! All Access is active',
            body: `Renews on ${activeUntil}.`,
          }
        : { tone: 'info', title: 'Purchase confirmed, but this subscription has expired.' };
    case 'cancelled':
      return { tone: 'info', title: 'Purchase cancelled', body: 'You weren’t charged.' };
    case 'failed':
      return {
        tone: 'danger',
        title: 'Purchase didn’t go through',
        body: `${flow.message} You weren’t charged.${activeUntil ? ' Your current All Access stays active.' : ''}`,
      };
    case 'nothingToRestore':
      return { tone: 'info', title: 'No previous purchases found for this store account.' };
  }
}

const ICONS: Record<Exclude<Tone, 'progress'>, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'time',
  danger: 'alert-circle',
};

export function PurchaseStatusPanel({
  flow,
  entitlement,
}: {
  flow: PurchaseFlow;
  entitlement: Entitlement | null;
}) {
  const copy = describe(flow, entitlement);
  if (!copy) return null;

  return (
    <Animated.View
      key={`${flow.status}-${copy.tone}`}
      entering={FadeIn}
      exiting={FadeOut}
      style={[styles.panel, styles[copy.tone]]}
      accessibilityLiveRegion="polite"
      accessibilityRole={copy.tone === 'danger' ? 'alert' : 'summary'}
      testID="purchase-status"
    >
      {copy.tone === 'progress' ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Ionicons
          name={ICONS[copy.tone]}
          size={sizes.icon}
          color={styles[`${copy.tone}Text`].color}
        />
      )}
      <View style={styles.copy}>
        <Text style={[styles.title, styles[`${copy.tone}Text`]]}>{copy.title}</Text>
        {copy.body && <Text style={styles.body}>{copy.body}</Text>}
      </View>
    </Animated.View>
  );
}
