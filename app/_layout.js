import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DraggableSidebar from '@/components/draggable-sidebar';
import FloatingNoteBubble from '@/components/floating-note-bubble/FloatingNoteBubble';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FloatingNoteProvider } from '@/hooks/useFloatingNote';

const queryClient = new QueryClient();

export const unstable_settings = {
  initialRouteName: 'inbox',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <FloatingNoteProvider>
              <DraggableSidebar>
                <Stack>
                  <Stack.Screen name="inbox" options={{ headerShown: false }} />
                  <Stack.Screen name="project/[projectId]" options={{ headerShown: false }} />
                  <Stack.Screen name="task/[taskId]" options={{ headerShown: false }} />
                  <Stack.Screen name="settings" options={{ headerShown: false }} />
                  <Stack.Screen name="tags" options={{ headerShown: false }} />
                  <Stack.Screen name="ai" options={{ headerShown: false }} />
                  <Stack.Screen name="test" options={{ headerShown: false }} />
                  <Stack.Screen name="blocks" options={{ headerShown: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                </Stack>
              </DraggableSidebar>
              <FloatingNoteBubble />
              <StatusBar style="auto" />
            </FloatingNoteProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
