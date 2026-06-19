import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { useMieszankiStore } from '../src/stores/mieszankiStore';
import { usePlanyStore } from '../src/stores/planyStore';
import { useLiveStore } from '../src/stores/liveStore';
import { lightTheme, darkTheme } from '../src/constants/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const zaladujMieszanki = useMieszankiStore((s) => s.zaladujMieszanki);
  const zaladujPlany = usePlanyStore((s) => s.zaladujPlany);
  const zaladujWpisy = useLiveStore((s) => s.zaladujWpisy);

  useEffect(() => {
    zaladujMieszanki();
    zaladujPlany();
    zaladujWpisy();
  }, []);

  return (
    <>
      <StatusBar style={theme.colors.statusBar} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="mieszanki"
          options={{ title: 'Mieszanki', headerShown: false }}
        />
        <Stack.Screen
          name="plan"
          options={{ title: 'Zaplanuj Masę', headerShown: false }}
        />
        <Stack.Screen
          name="wbudowywanie"
          options={{ title: 'Wbudowywanie', headerShown: false }}
        />
        <Stack.Screen
          name="archiwum"
          options={{ title: 'Archiwum', headerShown: false }}
        />
      </Stack>
    </>
  );
}
