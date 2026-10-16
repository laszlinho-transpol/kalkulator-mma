import { Platform } from 'react-native';
import { router } from 'expo-router';

/** Przycisk „domek” w nagłówku – zawsze do menu głównego, bez stosu ekranów za sobą. */
export function doMenuGlownego() {
  if (Platform.OS === 'web') {
    router.replace('/' as never);
    return;
  }
  try {
    router.dismissTo('/' as never);
  } catch {
    router.replace('/' as never);
  }
}

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
