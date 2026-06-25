// ============================================================
// ZAŁĄCZNIKI PLANU – kopiowanie PDF do pamięci lokalnej
// ============================================================

import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import type { ZalacznikPlanu } from '../types';

const generujId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export async function wybierzIZapiszZalacznik(ownerId: string, podfolder = 'plany'): Promise<ZalacznikPlanu | null> {
  const wynik = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });
  if (wynik.canceled || !wynik.assets?.[0]) return null;

  const asset = wynik.assets[0];
  const ext = asset.name?.split('.').pop() ?? 'pdf';
  const nazwa = asset.name ?? `zalacznik.${ext}`;
  const typ: ZalacznikPlanu['typ'] = asset.mimeType?.startsWith('image/') ? 'obraz' : 'pdf';

  const folder = new File(Paths.document, 'zalaczniki', podfolder, ownerId);
  if (!folder.exists) folder.create();

  const docel = new File(folder, `${generujId()}_${nazwa}`);
  const zrodlo = new File(asset.uri);
  zrodlo.copy(docel);

  return {
    id: generujId(),
    nazwa,
    typ,
    uri: docel.uri,
    createdAt: new Date().toISOString(),
  };
}

/** Załącznik do budowy (PZT, plan sytuacyjny) */
export async function wybierzIZapiszZalacznikBudowy(budowaId: string): Promise<ZalacznikPlanu | null> {
  return wybierzIZapiszZalacznik(budowaId, 'budowy');
}

/** @deprecated użyj wybierzIZapiszZalacznik */
export async function wybierzIZapiszZalacznikPlanu(planId: string): Promise<ZalacznikPlanu | null> {
  return wybierzIZapiszZalacznik(planId, 'plany');
}

export async function kopiujZalacznikiDlaNowegoPlanu(
  zalaczniki: ZalacznikPlanu[],
  nowyPlanId: string,
): Promise<ZalacznikPlanu[]> {
  const folder = new File(Paths.document, 'zalaczniki', nowyPlanId);
  if (!folder.exists) folder.create();
  const wynik: ZalacznikPlanu[] = [];
  for (const z of zalaczniki) {
    const zrodlo = new File(z.uri);
    if (!zrodlo.exists) continue;
    const docel = new File(folder, `${z.id}_${z.nazwa}`);
    zrodlo.copy(docel);
    wynik.push({ ...z, uri: docel.uri });
  }
  return wynik;
}
