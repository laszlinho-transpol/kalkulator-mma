import { Platform } from 'react-native';
import { router } from 'expo-router';

export function wstecz(fallback: string) {
  // W przeglądarce canGoBack bywa prawdziwe, a back() po replace nic nie robi.
  if (Platform.OS === 'web') {
    router.replace(fallback as never);
    return;
  }
  try {
    if (router.canGoBack()) router.back();
    else router.replace(fallback as never);
  } catch {
    router.replace(fallback as never);
  }
}
