import { router } from 'expo-router';

export function wstecz(fallback: string) {
  try {
    if (router.canGoBack()) router.back();
    else router.replace(fallback as never);
  } catch {
    router.replace(fallback as never);
  }
}
