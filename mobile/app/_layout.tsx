import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Stack, router, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useMieszankiStore } from '../src/stores/mieszankiStore';
import { usePlanyStore } from '../src/stores/planyStore';
import { useBudowyStore } from '../src/stores/budowyStore';
import { useWytwornieStore } from '../src/stores/wytwornieStore';
import { useLiveStore } from '../src/stores/liveStore';
import { useNotatnikStore } from '../src/stores/notatnikStore';
import { useObmiarStore } from '../src/stores/obmiarStore';
import { lightTheme, darkTheme } from '../src/constants/theme';
import { LoadingScreen } from '../src/components/common/LoadingScreen';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';

const KLUCZ_ONBOARDING = '@mma:onboardingComplete';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const rootNavigationState = useRootNavigationState();

  const zaladujMieszanki = useMieszankiStore((s) => s.zaladujMieszanki);
  const zaladujPlany = usePlanyStore((s) => s.zaladujPlany);
  const zaladujBudowy = useBudowyStore((s) => s.zaladujBudowy);
  const zaladujWytwornie = useWytwornieStore((s) => s.zaladujWytwornie);
  const zaladujWpisy = useLiveStore((s) => s.zaladujWpisy);
  const zaladujNotatnik = useNotatnikStore((s) => s.zaladuj);
  const zaladujObmiar = useObmiarStore((s) => s.zaladuj);

  const [ladowanie, setLadowanie] = useState(true);
  const [loadingWidoczny, setLoadingWidoczny] = useState(true);
  const [bladStartu, setBladStartu] = useState<string | null>(null);
  const [przekierujNaOnboarding, setPrzekierujNaOnboarding] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          zaladujMieszanki(),
          zaladujPlany(),
          zaladujWpisy(),
          zaladujBudowy(),
          zaladujWytwornie(),
          zaladujNotatnik(),
          zaladujObmiar(),
        ]);
        const onboardingComplete = await AsyncStorage.getItem(KLUCZ_ONBOARDING);
        if (!onboardingComplete) {
          setPrzekierujNaOnboarding(true);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Nieznany błąd startu';
        setBladStartu(msg);
      } finally {
        setLadowanie(false);
      }
    };
    init();
  }, []);

  // Nawigacja dopiero gdy router jest gotowy (zapobiega crashowi przy starcie)
  useEffect(() => {
    if (!rootNavigationState?.key || ladowanie || !przekierujNaOnboarding) return;
    const timer = setTimeout(() => router.replace('/onboarding'), 100);
    return () => clearTimeout(timer);
  }, [rootNavigationState?.key, ladowanie, przekierujNaOnboarding]);

  const headerOpacje = {
    headerStyle: { backgroundColor: theme.colors.card },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontWeight: '700' as const },
    contentStyle: { backgroundColor: theme.colors.background },
    headerShadowVisible: false,
    animation: 'slide_from_right' as const,
  };

  if (bladStartu) {
    return (
      <SafeAreaProvider>
        <View style={[styles.bladWrap, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.bladTytul, { color: theme.colors.primary }]}>Błąd uruchamiania</Text>
          <Text style={[styles.bladOpis, { color: theme.colors.textSecondary }]}>
            Dane lokalne mogły zostać uszkodzone po aktualizacji. Odinstaluj aplikację i zainstaluj ponownie z Play Store — Twoje dane na telefonie zostaną wyczyszczone, ale aplikacja powinna działać.
          </Text>
          <Text style={[styles.bladKod, { color: theme.colors.textSecondary }]}>{bladStartu}</Text>
          <TouchableOpacity
            style={[styles.bladBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => { setBladStartu(null); setLadowanie(true); }}
          >
            <Text style={styles.bladBtnTekst}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
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
        <Stack.Screen name="archiwum/obmiar/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="obmiar/index" options={{ headerShown: false }} />
        <Stack.Screen name="obmiar/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="niezbednik/index" options={{ headerShown: false }} />
        <Stack.Screen name="niezbednik/masa/index" options={{ headerShown: false }} />
        <Stack.Screen name="niezbednik/masa/wydajnosc-powierzchniowa" options={{ headerShown: false }} />
        <Stack.Screen name="niezbednik/masa/wydajnosc-grubosciowa" options={{ headerShown: false }} />
        <Stack.Screen name="niezbednik/masa/wskaznik-rozkladarki" options={{ headerShown: false }} />
        <Stack.Screen name="niezbednik/geodezja/spadki" options={{ headerShown: false }} />
        <Stack.Screen name="niezbednik/geodezja/luki" options={{ headerShown: false }} />
        <Stack.Screen name="niezbednik/geodezja/kat-prosty" options={{ headerShown: false }} />
        <Stack.Screen name="niezbednik/notatnik/index" options={{ headerShown: false }} />
      </Stack>

        {loadingWidoczny && (
          <LoadingScreen
            widoczny={ladowanie}
            onUkryj={() => setLoadingWidoczny(false)}
          />
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  bladWrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  bladTytul: { fontSize: 22, fontWeight: '800' },
  bladOpis: { fontSize: 15, lineHeight: 22 },
  bladKod: { fontSize: 12, fontFamily: 'monospace' },
  bladBtn: { marginTop: 8, padding: 14, borderRadius: 10, alignItems: 'center' },
  bladBtnTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
