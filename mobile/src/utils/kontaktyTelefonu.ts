import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Contact, requestPermissionsAsync } from 'expo-contacts';

export interface WybranyKontakt {
  nazwa: string;
  telefony: string[];
  stanowisko?: string;
}

interface KontaktPrzegladarki { name?: string[]; tel?: string[] }
interface WyborKontaktowPrzegladarki {
  select: (pola: string[], opcje?: { multiple?: boolean }) => Promise<KontaktPrzegladarki[]>;
}

function wyborPrzegladarki(): WyborKontaktowPrzegladarki | null {
  if (typeof navigator === 'undefined') return null;
  const kontakty = (navigator as Navigator & { contacts?: WyborKontaktowPrzegladarki }).contacts;
  return kontakty && typeof kontakty.select === 'function' ? kontakty : null;
}

/** Telefon zawsze; przeglądarka tylko z Contact Picker API (Chrome na Androidzie). */
export function czyMoznaWybracKontakt(): boolean {
  return Platform.OS !== 'web' || wyborPrzegladarki() != null;
}

export async function wybierzKontaktZTelefonu(): Promise<WybranyKontakt | null> {
  if (Platform.OS === 'web') {
    const wybor = wyborPrzegladarki();
    if (!wybor) return null;
    const [kontakt] = await wybor.select(['name', 'tel'], { multiple: false });
    if (!kontakt) return null;
    return { nazwa: kontakt.name?.[0]?.trim() ?? '', telefony: (kontakt.tel ?? []).map((t) => t.trim()).filter(Boolean) };
  }
  const zgoda = await requestPermissionsAsync();
  if (!zgoda.granted) throw new Error('Brak zgody na dostęp do kontaktów. Włącz ją w ustawieniach telefonu.');
  const kontakt = await Contact.presentPicker();
  if (!kontakt) return null;
  const [nazwa, telefony, stanowisko] = await Promise.all([
    kontakt.getFullName().catch(() => ''),
    kontakt.getPhones().catch(() => []),
    kontakt.getJobTitle().catch(() => null),
  ]);
  return {
    nazwa: nazwa.trim(),
    telefony: telefony.map((t) => t.number?.trim() ?? '').filter(Boolean),
    stanowisko: stanowisko?.trim() || undefined,
  };
}

/** Okno udostępniania systemu; bez niego (np. przeglądarka na komputerze) – kopiowanie. Zwraca true przy kopiowaniu. */
export async function udostepnijTekst(tekst: string): Promise<boolean> {
  if (Platform.OS === 'web' && (typeof navigator === 'undefined' || typeof navigator.share !== 'function')) {
    await Clipboard.setStringAsync(tekst);
    return true;
  }
  try {
    await Share.share({ message: tekst });
    return false;
  } catch {
    await Clipboard.setStringAsync(tekst);
    return true;
  }
}
