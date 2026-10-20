// ============================================================
// KOPIA ZAPASOWA – zapis/odczyt pliku i pamięci aplikacji
// ============================================================

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { WERSJA_APLIKACJI } from '../constants/version';
import {
  PREFIKS_DANYCH, nazwaPlikuKopii, odczytajKopie, planPrzywracania, utworzKopie,
  type KopiaZapasowa, type WynikOdczytuKopii,
} from './kopiaZapasowa';
import { useMieszankiStore } from '../stores/mieszankiStore';
import { usePlanyStore } from '../stores/planyStore';
import { useBudowyStore } from '../stores/budowyStore';
import { useWytwornieStore } from '../stores/wytwornieStore';
import { useLiveStore } from '../stores/liveStore';
import { useNotatnikStore } from '../stores/notatnikStore';
import { useObmiarStore } from '../stores/obmiarStore';
import { useGrafikaMaszynStore } from '../stores/grafikaMaszynStore';
import { useFirmyStore } from '../stores/firmyStore';
import { usePracownicyStore } from '../stores/pracownicyStore';
import { useGrupyPracownikowStore } from '../stores/grupyPracownikowStore';
import { useSprzetStore } from '../stores/sprzetStore';
import { useGeodezjaStore } from '../stores/geodezjaStore';

async function kluczeAplikacji(): Promise<string[]> {
  const wszystkie = await AsyncStorage.getAllKeys();
  return wszystkie.filter((k) => k.startsWith(PREFIKS_DANYCH));
}

export async function zbierzKopie(): Promise<KopiaZapasowa> {
  const pary = await AsyncStorage.multiGet(await kluczeAplikacji());
  return utworzKopie(pary, WERSJA_APLIKACJI);
}

/** Web: pobranie pliku. Telefon: okno udostępniania (Dysk, e-mail, Pliki…). Zwraca nazwę pliku. */
export async function zapiszPlikKopii(kopia: KopiaZapasowa): Promise<string> {
  const nazwa = nazwaPlikuKopii();
  const json = JSON.stringify(kopia);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nazwa;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return nazwa;
  }
  const plik = new File(Paths.cache, nazwa);
  if (plik.exists) plik.delete();
  plik.write(json);
  await Sharing.shareAsync(plik.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Zapisz kopię zapasową',
  });
  return nazwa;
}

export async function wybierzPlikKopii(): Promise<WynikOdczytuKopii | null> {
  let wynik: DocumentPicker.DocumentPickerResult;
  try {
    wynik = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
  } catch {
    return { sukces: false, blad: 'Nie udało się otworzyć wyboru pliku.' };
  }
  const plik = wynik.canceled ? undefined : wynik.assets?.[0];
  if (!plik) return null;
  try {
    const tekst = plik.file ? await plik.file.text() : await new File(plik.uri).text();
    return odczytajKopie(tekst);
  } catch {
    return { sukces: false, blad: 'Nie udało się odczytać pliku kopii.' };
  }
}

/** Zastępuje wszystkie dane aplikacji zawartością kopii i odświeża magazyny. */
export async function przywrocKopie(kopia: KopiaZapasowa): Promise<void> {
  const { usun, zapisz } = planPrzywracania(await kluczeAplikacji(), kopia);
  if (usun.length > 0) await AsyncStorage.multiRemove(usun);
  await AsyncStorage.multiSet(zapisz);
  await Promise.all([
    useMieszankiStore.getState().zaladujMieszanki(),
    usePlanyStore.getState().zaladujPlany(),
    useLiveStore.getState().zaladujWpisy(),
    useBudowyStore.getState().zaladujBudowy(),
    useWytwornieStore.getState().zaladujWytwornie(),
    useNotatnikStore.getState().zaladuj(),
    useObmiarStore.getState().zaladuj(),
    useGrafikaMaszynStore.getState().zaladuj(),
    useFirmyStore.getState().zaladuj(),
    usePracownicyStore.getState().zaladuj(),
    useGrupyPracownikowStore.getState().zaladuj(),
    useSprzetStore.getState().zaladuj(),
    useGeodezjaStore.getState().zaladuj(),
  ]);
}
