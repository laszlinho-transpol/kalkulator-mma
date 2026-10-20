import React from 'react';
import { router } from 'expo-router';
import { ListaRysunkow } from '../../../src/components/geodezja/ListaRysunkow';
import { useGeodezjaStore } from '../../../src/stores/geodezjaStore';
import { nowySzkicGeodezyjny, warstwySzkicu } from '../../../src/geodezja/szkic';

export default function SzkiceGeodezyjneScreen() {
  const szkice = useGeodezjaStore((s) => s.szkice);
  const zapiszSzkic = useGeodezjaStore((s) => s.zapiszSzkic);

  const nowy = async () => {
    const s = nowySzkicGeodezyjny(`Szkic ${szkice.length + 1}`);
    await zapiszSzkic(s);
    router.push(`/niezbednik/geodezja/szkic/${s.id}` as never);
  };

  return (
    <ListaRysunkow
      tytul="Szkice geodezyjne"
      tekstNowy="Nowy szkic"
      pusteTytul="Brak szkiców"
      onNowy={nowy}
      onOtworz={(id) => router.push(`/niezbednik/geodezja/szkic/${id}` as never)}
      pozycje={szkice.map((s) => {
        const warstwy = warstwySzkicu(s).length;
        return {
          id: s.id,
          nazwa: s.nazwa,
          opis: s.opis,
          archiwum: s.archiwum,
          updatedAt: s.updatedAt,
          podsumowanie: [`Punkty: ${s.punkty.length}`, `Połączenia: ${s.linie.length}`, warstwy ? `Warstwy: ${warstwy}` : null]
            .filter(Boolean).join(' · '),
        };
      })}
    />
  );
}
