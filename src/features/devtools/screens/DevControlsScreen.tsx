import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import type { ChatServer } from '@/mock-backend/chatServer';
import type { MockNetwork } from '@/mock-backend/mockNetwork';

import { ActionRow, SwitchRow } from '../components/ControlRow';
import { ControlSection } from '../components/ControlSection';
import { styles } from './DevControlsScreen.styles';

const INCOMING_BATCH = 4;

type Props = {
  network: MockNetwork;
  chatServer: ChatServer;
  onReset: () => void;
};

export function DevControlsScreen({ network, chatServer, onReset }: Props) {
  const insets = useSafeAreaInsets();
  const state = useStore(network.state);
  const [isDelivering, setIsDelivering] = useState(false);

  const deliverIncoming = async () => {
    setIsDelivering(true);
    try {
      await chatServer.deliverIncoming(INCOMING_BATCH);
    } finally {
      setIsDelivering(false);
    }
  };

  const confirmReset = () =>
    Alert.alert(
      'Reset all data?',
      'Deletes the client outbox and cache, the mock backend (history is regenerated) and simulated purchases.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: onReset },
      ],
    );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + styles.content.gap },
      ]}
    >
      <Text style={styles.intro}>
        Everything here drives the local mock backend. Nothing leaves the device.
      </Text>

      <ControlSection title="Network">
        <SwitchRow
          label="Online"
          description="Off simulates airplane mode: requests fail before reaching the server."
          value={state.isOnline}
          onValueChange={(value) => network.setOnline(value)}
          testID="toggle-online"
        />
        <SwitchRow
          label="Lose next send response"
          description="The server accepts the next message, but the app never hears back."
          value={state.loseNextSendResponse}
          onValueChange={(value) => network.setFault('loseNextSendResponse', value)}
          testID="toggle-lose-response"
        />
        <SwitchRow
          label="Fail next send (503)"
          description="Recoverable server error. The app retries automatically, then offers Retry."
          value={state.failNextSendWithServerError}
          onValueChange={(value) => network.setFault('failNextSendWithServerError', value)}
          testID="toggle-server-error"
        />
      </ControlSection>

      <ControlSection title="Chat backend">
        <ActionRow
          label={`Deliver ${INCOMING_BATCH} messages from Ethan`}
          description="Written straight to the backend. While offline, the app only sees them after reconnecting."
          onPress={deliverIncoming}
          isDisabled={isDelivering}
          testID="deliver-incoming"
        />
      </ControlSection>

      <ControlSection title="Data">
        <ActionRow label="Reset all data" onPress={confirmReset} isDestructive testID="reset" />
      </ControlSection>
    </ScrollView>
  );
}
