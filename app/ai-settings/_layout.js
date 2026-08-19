import { Stack } from 'expo-router';

export default function AISettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="api-keys" />
      <Stack.Screen name="chat-defaults" />
      <Stack.Screen name="system-prompt" />
      <Stack.Screen name="tools" />
    </Stack>
  );
}
