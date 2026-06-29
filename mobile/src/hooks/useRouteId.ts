import { useLocalSearchParams } from 'expo-router';

/** Expo Router czasem zwraca id jako string | string[] */
export function useRouteId(): string | undefined {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  if (id == null) return undefined;
  return Array.isArray(id) ? id[0] : id;
}
