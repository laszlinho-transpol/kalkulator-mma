import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useAppTheme } from '../src/context/ThemeContext';
import { useMieszankiStore } from '../src/stores/mieszankiStore';
import { usePlanyStore } from '../src/stores/planyStore';
import { useLiveStore } from '../src/stores/liveStore';
import { LoadingScreen } from '../src/components/common/LoadingScreen';

const KLUCZ_ONBOARDING = '@mma:onboardingComplete';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutInner() {
  const { theme } = useAppTheme();

  const zaladujMieszanki = useMieszankiStore((s) => s.zaladujMieszanki);
  const zaladujPlany = usePlanyStore((s) => s.zaladujPlany);
  const zaladujWpisy = useLiveStore((s) => s.zaladujWpisy);

  const [ladowanie, setLadowanie] = useState(true);
  const [loadingWidoczny, setLoadingWidoczny] = useState(true);

  useEffect(() => {
    const init = async () => {
      await Promise.all([zaladujMieszanki(), zaladujPlany(), zaladujWpisy()]);
      const onboardingComplete = await AsyncStorage.getItem(KLUCZ_ONBOARDING);
      setLadowanie(false);
      if (!onboardingComplete) {
        setTimeout(() => router.replace('/onboarding'), 600);
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
        <Stack.Screen
          name="ustawienia"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
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
        <Stack.Screen
          name="plan/edytuj/[id]"
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="wbudowywanie/index" options={{ headerShown: false }} />
        <Stack.Screen name="wbudowywanie/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="archiwum/index" options={{ headerShown: false }} />
        <Stack.Screen name="archiwum/[id]" options={{ headerShown: false }} />
      </Stack>

      {/* Ekran ładowania (znika po załadowaniu danych) */}
      {loadingWidoczny && (
        <LoadingScreen
          widoczny={ladowanie}
          onUkryj={() => setLoadingWidoczny(false)}
        />
      )}
    </>
  );
}
