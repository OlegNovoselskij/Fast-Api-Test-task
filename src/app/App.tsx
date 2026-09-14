import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export function App() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>FanSuite Chat</Text>
        </View>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
