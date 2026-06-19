import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useMieszankiStore } from '../src/stores/mieszankiStore';
import { usePlanyStore } from '../src/stores/planyStore';
import { useLiveStore } from '../src/stores/liveStore';
import { lightTheme, darkTheme } from '../src/constants/theme';

const KLUCZ_ONBOARDING = '@mma:onboardingComplete';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const zaladujMieszanki = useMieszankiStore((s) => s.zaladujMieszanki);
  const zaladujPlany = usePlanyStore((s) => s.zaladujPlany);
  const zaladujWpisy = useLiveStore((s) => s.zaladujWpisy);

  const [gotowy, setGotowy] = useState(false);

  useEffect(() => {
    const init = async () => {
      await Promise.all([zaladujMieszanki(), zaladujPlany(), zaladujWpisy()]);
      const onboardingComplete = await AsyncStorage.getItem(KLUCZ_ONBOARDING);
      setGotowy(true);
      if (!onboardingComplete) {
        // Krótki delay, żeby layout zdążył się zamontować
        setTimeout(() => router.replace('/onboarding'), 50);
      }
    };
    init();
  }, []);

  const headerOpacje = {
    headerStyle: { backgroundColor: theme.colors.card },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontWeight: '700' as const },
    contentStyle: { backgroundColor: theme.colors.background },
    headerShadowVisible: false,
    animation: 'slide_from_right' as const,
  };

  return (
    <>
      <StatusBar style={theme.colors.statusBar} />
      <Stack screenOptions={headerOpacje}>
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen name="mieszanki/index" options={{ headerShown: false }} />
        <Stack.Screen name="plan/index" options={{ headerShown: false }} />
        <Stack.Screen
          name="plan/nowy"
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="plan/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="plan/import"
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="wbudowywanie/index" options={{ headerShown: false }} />
        <Stack.Screen name="wbudowywanie/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="archiwum/index" options={{ headerShown: false }} />
        <Stack.Screen name="archiwum/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
