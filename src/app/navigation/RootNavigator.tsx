import { NavigationContainer } from '@react-navigation/native';
import { Button } from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { ChatScreen } from '@/features/chat';
import { DevControlsScreen } from '@/features/devtools';

import { useServices } from '../ServicesProvider';

export type RootStackParamList = {
  Chat: undefined;
  DevControls: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function ChatRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Chat'>) {
  const { services } = useServices();
  return (
    <ChatScreen engine={services.chat} onOpenControls={() => navigation.navigate('DevControls')} />
  );
}

function DevControlsRoute() {
  const { services, resetAppData } = useServices();
  return (
    <DevControlsScreen
      network={services.network}
      chatServer={services.chatServer}
      onReset={() => void resetAppData()}
    />
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Chat" component={ChatRoute} options={{ headerShown: false }} />
        <Stack.Screen
          name="DevControls"
          component={DevControlsRoute}
          options={({ navigation }) => ({
            presentation: 'modal',
            title: 'Simulation controls',
            headerRight: () => <Button title="Done" onPress={() => navigation.goBack()} />,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
