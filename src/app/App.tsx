import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './navigation/RootNavigator';
import { ServicesProvider } from './ServicesProvider';

export function App() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <StatusBar style="dark" />
        <ServicesProvider>
          <RootNavigator />
        </ServicesProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
