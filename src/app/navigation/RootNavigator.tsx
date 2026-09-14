import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Button } from 'react-native';
import { useStore } from 'zustand';

import { ChatScreen } from '@/features/chat';
import { DevControlsScreen } from '@/features/devtools';
import { AccessBadge, PaywallScreen } from '@/features/paywall';

import { useServices } from '../ServicesProvider';

export type RootStackParamList = {
  Chat: undefined;
  Paywall: undefined;
  DevControls: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function ChatRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Chat'>) {
  const { services } = useServices();
  const accessState = useStore(services.access.state);
  const openPaywall = () => navigation.navigate('Paywall');

  return (
    <ChatScreen
      engine={services.chat}
      headerAccessory={<AccessBadge {...accessState} onPress={openPaywall} />}
      onOpenControls={() => navigation.navigate('DevControls')}
      onUpgrade={openPaywall}
    />
  );
}

function PaywallRoute() {
  const { services } = useServices();
  return <PaywallScreen access={services.access} />;
}

function DevControlsRoute() {
  const { services, resetAppData } = useServices();
  return (
    <DevControlsScreen
      network={services.network}
      chatServer={services.chatServer}
      billingServer={services.billingServer}
      store={services.store}
      onReset={() => void resetAppData()}
    />
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Chat" component={ChatRoute} options={{ headerShown: false }} />
        <Stack.Group
          screenOptions={({ navigation }) => ({
            presentation: 'modal',
            headerRight: () => <Button title="Done" onPress={() => navigation.goBack()} />,
          })}
        >
          <Stack.Screen name="Paywall" component={PaywallRoute} options={{ title: 'All Access' }} />
          <Stack.Screen
            name="DevControls"
            component={DevControlsRoute}
            options={{ title: 'Simulation controls' }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
