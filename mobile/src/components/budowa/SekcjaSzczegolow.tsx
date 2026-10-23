// Konstrukcje › Szczegóły: przekroje poprzeczne przypisane do budowy – karty z podglądem i opisem.

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Naciskany, Pole, Przycisk, useMotyw, PROMIEN } from '../ui';
import { Okienko, PrzyciskPaska } from '../geodezja/Okienko';
import { PodgladPrzekroju } from '../geodezja/EdytorPrzekroju';
import { useGeodezjaStore } from '../../stores/geodezjaStore';
import { dodajSzczegolBudowy, przesunSzczegolBudowy, zapiszSzczegolBudowy } from '../../geodezja/szczegolyBudowy';
import { szerokoscPrzekroju, type PrzekrojPoprzeczny } from '../../geodezja/przekroj';
import { fm } from '../../geodezja/geometria';
import type { ProjektBudowy, SzczegolBudowy } from '../../types';

interface Props {
  budowaId: string;
  projekt: ProjektBudowy;
  onZmien: (p: ProjektBudowy) => void;
}

export function SekcjaSzczegolow({ budowaId, projekt, onZmien }: Props) {
  const theme = useMotyw();
  const szczegoly = projekt.szczegoly ?? [];
  const [oknoDodaj, setOknoDodaj] = useState(false);
  const [opisDla, setOpisDla] = useState<SzczegolBudowy | null>(null);
  const otworz = (id: string) => router.push({ pathname: '/budowa/szczegol/[id]', params: { id, budowaId } } as never);

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
        Szczegóły to kopie przekrojów z Geodezji i pomiarów. Otwórz szczegół, aby go edytować albo wykonać pomiar – zmiany nie wpływają na szablon.
      </Text>
      <Przycisk ikona="plus" tekst="Dodaj szczegół" onPress={() => setOknoDodaj(true)} />
      {szczegoly.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 12 }}>Brak szczegółów w tej budowie.</Text>
      ) : null}
      <View style={styles.siatka}>
        {szczegoly.map((s, i) => (
          <View key={s.id} style={[styles.karta, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
            <Naciskany accessibilityRole="button" accessibilityLabel={`Otwórz szczegół ${s.nazwa}`} onPress={() => otworz(s.id)}>
              <View style={[styles.podglad, { borderColor: theme.colors.border }]}>
                <PodgladPrzekroju przekroj={s} wys={150} />
              </View>
              <View style={{ paddingHorizontal: 10, paddingTop: 8, gap: 2 }}>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{i + 1}. {s.nazwa}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                  {s.elementy.length} el. · szer. {fm(szerokoscPrzekroju(s) / 100, 2)} m{s.pomiar ? ' · pomiar' : ''}
                </Text>
                {s.opis ? (
                  <Text style={{ color: theme.colors.text, fontSize: 13, marginTop: 4 }} numberOfLines={4}>{s.opis}</Text>
                ) : (
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, fontStyle: 'italic' }}>Bez opisu</Text>
                )}
              </View>
            </Naciskany>
            <View style={styles.akcje}>
              <PrzyciskPaska tekst="✎ Opis" onPress={() => setOpisDla(s)} accessibilityLabel={`Opis szczegółu ${s.nazwa}`} />
              <PrzyciskPaska tekst="◀" onPress={() => onZmien(przesunSzczegolBudowy(projekt, s.id, -1))} accessibilityLabel={`Szczegół ${s.nazwa} wcześniej`} style={i === 0 ? { opacity: 0.4 } : undefined} />
              <PrzyciskPaska tekst="▶" onPress={() => onZmien(przesunSzczegolBudowy(projekt, s.id, 1))} accessibilityLabel={`Szczegół ${s.nazwa} dalej`} style={i === szczegoly.length - 1 ? { opacity: 0.4 } : undefined} />
              <View style={{ flex: 1 }} />
              <PrzyciskPaska tekst="Otwórz ›" onPress={() => otworz(s.id)} accessibilityLabel={`Edytuj szczegół ${s.nazwa}`} />
            </View>
          </View>
        ))}
      </View>

      {oknoDodaj ? (
        <OknoDodaniaSzczegolu
          onAnuluj={() => setOknoDodaj(false)}
          onWybierz={(szablon) => {
            onZmien(dodajSzczegolBudowy(projekt, szablon));
            setOknoDodaj(false);
          }}
        />
      ) : null}
      {opisDla ? (
        <OknoOpisu
          szczegol={opisDla}
          onAnuluj={() => setOpisDla(null)}
          onZapisz={(nazwa, opis) => {
            onZmien(zapiszSzczegolBudowy(projekt, { ...opisDla, nazwa, opis }));
            setOpisDla(null);
          }}
        />
      ) : null}
    </View>
  );
}

function OknoDodaniaSzczegolu({ onAnuluj, onWybierz }: { onAnuluj: () => void; onWybierz: (szablon?: PrzekrojPoprzeczny) => void }) {
  const theme = useMotyw();
  const szablony = useGeodezjaStore((s) => s.przekroje).filter((p) => !p.archiwum);
  return (
    <Okienko widoczne tytul="Dodaj szczegół" onAnuluj={onAnuluj}>
      <Text style={{ color: theme.colors.textSecondary }}>Wybierz szablon przekroju z Geodezji i pomiarów – do budowy trafi jego kopia.</Text>
      {szablony.length === 0 ? <Text style={{ color: theme.colors.textSecondary }}>Brak zapisanych szablonów przekroju.</Text> : null}
      {szablony.map((p) => (
        <Naciskany
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={`Dodaj z szablonu ${p.nazwa}`}
          onPress={() => onWybierz(p)}
          style={[styles.szablon, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
        >
          <View style={[styles.podglad, { borderColor: theme.colors.border, borderRadius: PROMIEN.m }]}>
            <PodgladPrzekroju przekroj={p} wys={90} />
          </View>
          <Text style={{ color: theme.colors.text, fontWeight: '800' }} numberOfLines={1}>{p.nazwa}</Text>
          {p.opis ? <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={2}>{p.opis}</Text> : null}
        </Naciskany>
      ))}
      <Przycisk wariant="drugi" ikona="plus" tekst="Pusty przekrój" onPress={() => onWybierz()} />
    </Okienko>
  );
}

function OknoOpisu({ szczegol, onAnuluj, onZapisz }: { szczegol: SzczegolBudowy; onAnuluj: () => void; onZapisz: (nazwa: string, opis?: string) => void }) {
  const [nazwa, setNazwa] = useState(szczegol.nazwa);
  const [opis, setOpis] = useState(szczegol.opis ?? '');
  return (
    <Okienko widoczne tytul="Opis szczegółu" onAnuluj={onAnuluj} onZapisz={() => onZapisz(nazwa.trim() || szczegol.nazwa, opis.trim() || undefined)}>
      <Pole etykieta="Nazwa" value={nazwa} onChangeText={setNazwa} accessibilityLabel="Nazwa szczegółu" />
      <Pole etykieta="Opis" value={opis} onChangeText={setOpis} multiline accessibilityLabel="Opis szczegółu" />
    </Okienko>
  );
}

const styles = StyleSheet.create({
  siatka: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  karta: { flexGrow: 1, flexBasis: 280, maxWidth: '100%', borderWidth: 1, borderRadius: PROMIEN.l, overflow: 'hidden', paddingBottom: 8 },
  podglad: { borderBottomWidth: 1, overflow: 'hidden' },
  akcje: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingTop: 8 },
  szablon: { borderWidth: 1, borderRadius: PROMIEN.m, padding: 8, gap: 4 },
});
