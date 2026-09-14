import { Text } from 'react-native';

import type { MessageQuota } from '@/mock-backend/chatServer';

import { styles } from './QuotaLabel.styles';

export function QuotaLabel({ quota }: { quota: MessageQuota | null }) {
  if (!quota) return null;
  if (quota.isUnlimited) {
    return (
      <Text style={styles.label}>
        Available messages: <Text style={styles.accent}>Unlimited</Text>
      </Text>
    );
  }
  return (
    <Text style={styles.label} accessibilityLiveRegion="polite">
      Free messages left:{' '}
      <Text style={quota.remaining === 0 ? styles.danger : styles.accent}>{quota.remaining}</Text>
    </Text>
  );
}
