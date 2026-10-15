import { Platform } from 'react-native';
import { adresZMiejsca, czyKrotkiLinkMaps, odczytajMiejsce } from './mapaLokalizacji';

/**
 * Adres do podglądu mapy z linku Google Maps. Skrócony link (maps.app.goo.gl) da się rozwinąć
 * tylko w aplikacji – przeglądarka blokuje to zapytanie (brak CORS po stronie Google).
 */
export async function adresZLinkuMaps(link: string): Promise<string | null> {
  const tekst = link.trim();
  if (!tekst) return null;
  if (!czyKrotkiLinkMaps(tekst)) {
    const miejsce = odczytajMiejsce(tekst);
    return miejsce ? adresZMiejsca(miejsce) : null;
  }
  if (Platform.OS === 'web') return null;
  try {
    const odp = await fetch(tekst, { method: 'GET' });
    const miejsce = odp.url ? odczytajMiejsce(odp.url) : null;
    return miejsce ? adresZMiejsca(miejsce) : null;
  } catch {
    return null;
  }
}
