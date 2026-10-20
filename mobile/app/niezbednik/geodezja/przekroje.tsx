import React from 'react';
import { router } from 'expo-router';
import { ListaRysunkow } from '../../../src/components/geodezja/ListaRysunkow';
import { useGeodezjaStore } from '../../../src/stores/geodezjaStore';
import { nowyPrzekroj, szerokoscPrzekroju } from '../../../src/geodezja/przekroj';
import { fm } from '../../../src/geodezja/geometria';

export default function PrzekrojeScreen() {
  const przekroje = useGeodezjaStore((s) => s.przekroje);
  const zapiszPrzekroj = useGeodezjaStore((s) => s.zapiszPrzekroj);

  const nowy = async () => {
    const p = nowyPrzekroj(`Przekrój ${przekroje.length + 1}`);
    await zapiszPrzekroj(p);
    router.push(`/niezbednik/geodezja/przekroj/${p.id}` as never);
  };

  return (
    <ListaRysunkow
      tytul="Przekroje poprzeczne"
      tekstNowy="Nowy przekrój"
      pusteTytul="Brak szablonów przekroju"
      onNowy={nowy}
      onOtworz={(id) => router.push(`/niezbednik/geodezja/przekroj/${id}` as never)}
      pozycje={przekroje.map((p) => ({
        id: p.id,
        nazwa: p.nazwa,
        opis: p.opis,
        archiwum: p.archiwum,
        updatedAt: p.updatedAt,
        podsumowanie: `Elementy: ${p.elementy.length} · szerokość ${fm(szerokoscPrzekroju(p) / 100, 2)} m`,
      }))}
    />
  );
}
