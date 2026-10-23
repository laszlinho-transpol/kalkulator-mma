import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, Karta, Pole, Przycisk, Sekcja, SiatkaDanych, useMotyw, ODSTEP, TYPOGRAFIA } from '../../../../src/components/ui';
import { formatujDzienIso } from '../../../../src/components/common/KalendarzDnia';
import { liczbaRaportow } from '../../../../src/components/budowa/SekcjaRaporty';
import { WierszWyboru } from '../../../../src/components/raportyBudowy/wspolne';
import { etykietaMiesiaca } from '../../../../src/raportyBudowy/raporty';
import { dojazdRaportu, kwotaPracownika, liniePodsumowania, nazwaPracownika } from '../../../../src/budzet/pracownicy';
import { parsujLiczbePola } from '../../../../src/budzet/rozliczenie';
import {
  DOMYSLNE_GODZINY_NA_ZIME, bankR8, czyMiesiacSezonuR8, godzinyNaZime, nazwaBrygady, nazwaNieobecnosci,
  ostatniDzienMiesiaca, podsumowanieMiesiaca, rodzajRaportu, rozliczNieobecnosci,
} from '../../../../src/budzet/nieobecnosci';
import { dataKrotko } from '../../../../src/budzet/wyswietlanie';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useBudowyStore } from '../../../../src/stores/budowyStore';
import { useGrupyPracownikowStore } from '../../../../src/stores/grupyPracownikowStore';
import { usePracownicyStore } from '../../../../src/stores/pracownicyStore';
import { dokumentMiesiacaPracownika } from '../../../../src/eksport/dokumenty';
import { udostepnijDokumentPdf } from '../../../../src/eksport/udostepnijPdf';
import { formatLiczby, round2 } from '../../../../src/utils/calculations';

const wielkaLitera = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const h = (n: number) => `${formatLiczby(n)} h`;
const zl = (n: number) => `${formatLiczby(n)} zł`;
const dni = (n: number) => (n === 1 ? '1 dzień' : `${n} dni`);

export default function MiesiacPracownikaScreen() {
  const id = useRouteId();
  const { miesiac = '' } = useLocalSearchParams<{ miesiac?: string }>();
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const pracownik = usePracownicyStore((s) => s.pracownicy.find((p) => p.id === id));
  const wszystkie = usePracownicyStore((s) => s.raporty);
  const ustawGodzinyNaZime = usePracownicyStore((s) => s.ustawGodzinyNaZime);
  const budowy = useBudowyStore((s) => s.budowy);
  const grupy = useGrupyPracownikowStore((s) => s.grupy);

  const raporty = useMemo(() => wszystkie.filter((r) => r.pracownikId === id), [wszystkie, id]);
  const podsumowanie = useMemo(
    () => (pracownik ? podsumowanieMiesiaca(pracownik, raporty, miesiac) : undefined),
    [pracownik, raporty, miesiac],
  );
  const wzory = useMemo(() => (pracownik ? rozliczNieobecnosci(pracownik, raporty) : new Map()), [pracownik, raporty]);
  const bank = useMemo(() => (pracownik ? bankR8(pracownik, raporty, miesiac) : undefined), [pracownik, raporty, miesiac]);

  const zapisane = pracownik ? godzinyNaZime(pracownik, miesiac) : 0;
  const [rozwiniete, setRozwiniete] = useState(false);
  const [godzinyTekst, setGodzinyTekst] = useState(String(zapisane || DOMYSLNE_GODZINY_NA_ZIME).replace('.', ','));
  const [blad, setBlad] = useState('');
  const powrot = `/budzet/pracownicy/${id}?zakladka=raporty`;

  if (!pracownik || !podsumowanie || !bank) {
    return (
      <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Raporty" lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/budzet/pracownicy') }} />
        <Text style={[styles.brak, { color: theme.colors.textSecondary }]}>Nie znaleziono pracownika.</Text>
      </View>
    );
  }

  const p = podsumowanie;
  const godziny = parsujLiczbePola(godzinyTekst);
  const pokazR8 = czyMiesiacSezonuR8(miesiac) || zapisane > 0 || rozwiniete;
  const zaznaczony = zapisane > 0;

  const zapiszGodziny = async (wartosc: number | null) => {
    if (wartosc != null && !(wartosc > 0)) { setBlad('Podaj liczbę godzin większą od zera.'); return; }
    setBlad('');
    await ustawGodzinyNaZime(pracownik.id, miesiac, wartosc);
  };

  const nazwaPozycji = (typ: 'budowa' | 'brygada', pozId?: string) => {
    if (typ === 'brygada') return nazwaBrygady(grupy, pozId);
    const b = budowy.find((x) => x.id === pozId);
    return b ? `${b.kodBudowy} · ${b.nazwaInwestycji}` : 'Budowa usunięta';
  };

  const raportyOdNajnowszych = [...p.raporty].reverse();

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={miesiac ? etykietaMiesiaca(miesiac) : 'Raporty'}
        podtytul={`${nazwaPracownika(pracownik)} · ${liczbaRaportow(p.raporty.length)}`}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(powrot) }}
        udostepnij={() => udostepnijDokumentPdf(dokumentMiesiacaPracownika({ pracownik, miesiac, raporty, budowy, grupy }))}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
        <Sekcja tytul="Podsumowanie" info="Godziny z dni pracy. UW, R8, UB i NB liczą się w dniach roboczych, L4 w dniach kalendarzowych. UB i NB to 0 zł.">
          <SiatkaDanych
            pozycje={[
              { etykieta: 'Przepracowane', wartosc: h(p.godzinyPracy) },
              { etykieta: 'Nadgodziny', wartosc: h(p.nadgodziny), dopisek: p.odlozenie.godziny ? `${h(p.odlozenie.godziny)} na zimę` : undefined },
              { etykieta: 'Urlop UW', wartosc: dni(p.dniUW) },
              { etykieta: 'Zwolnienie L4', wartosc: dni(p.dniL4) },
              { etykieta: 'Wolne R8', wartosc: dni(p.dniR8) },
              { etykieta: 'Urlop bezpłatny UB', wartosc: dni(p.dniUB) },
              { etykieta: 'Nieobecność NB', wartosc: dni(p.dniNB) },
              { etykieta: 'Bank R8 na koniec', wartosc: h(bank.saldo), kolor: bank.saldo < 0 ? theme.colors.danger : undefined },
            ]}
          />
          <View style={[styles.kwoty, { borderColor: theme.colors.border }]}>
            <View style={styles.kwota}>
              <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Wypłata pracownika</Text>
              <Text accessibilityLabel="Wypłata pracownika" style={[TYPOGRAFIA.duza, { color: theme.colors.text }]}>{zl(p.wyplata)}</Text>
              <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>
                {p.delegacje ? `+ delegacje ${zl(p.delegacje)}` : 'bez delegacji'}
              </Text>
            </View>
            <View style={styles.kwota}>
              <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Koszt pracodawcy</Text>
              <Text accessibilityLabel="Koszt pracodawcy" style={[TYPOGRAFIA.duza, { color: theme.colors.text }]}>{zl(p.koszt)}</Text>
              <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>z ZUS i delegacjami</Text>
            </View>
          </View>
        </Sekcja>

        <Sekcja tytul="Podział kosztów" info="Dni pracy idą na budowy. UW, L4, R8, UB, NB i odłożone nadgodziny idą na brygadę pracownika.">
          {p.podzial.length === 0 ? (
            <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Brak kosztów w tym miesiącu.</Text>
          ) : p.podzial.map((poz) => (
            <View key={poz.klucz} style={[styles.pozycja, { borderColor: theme.colors.border }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]} numberOfLines={2}>{nazwaPozycji(poz.typ, poz.id)}</Text>
                <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>
                  {poz.typ} · wypłata {zl(poz.wyplata)}
                </Text>
              </View>
              <Text accessibilityLabel={`Koszt ${nazwaPozycji(poz.typ, poz.id)}`} style={[TYPOGRAFIA.wartosc, { color: poz.koszt < 0 ? theme.colors.danger : theme.colors.text }]}>
                {zl(poz.koszt)}
              </Text>
            </View>
          ))}
        </Sekcja>

        {pokazR8 ? (
          <Sekcja
            tytul="R8 – nadgodziny na zimę"
            info="Zaznacz, żeby odłożyć wypracowane nadgodziny do banku R8. Wypłata i koszt tego miesiąca maleją o te godziny; pracownik odbierze je jako dni R8 zimą albo w innym okresie."
          >
            <WierszWyboru
              zaznaczony={zaznaczony}
              tytul="R8 – zabrać godziny na zimę"
              opis={zaznaczony
                ? `Odłożono ${h(zapisane)} × ${zl(p.odlozenie.stawka)}`
                : `Domyślnie ${DOMYSLNE_GODZINY_NA_ZIME} h – liczbę zmienisz poniżej`}
              prawy={zaznaczony ? `−${zl(p.odlozenie.wynagrodzenie)}` : undefined}
              accessibilityLabel="R8 – zabrać godziny na zimę"
              onPress={() => { void zapiszGodziny(zaznaczony ? null : godziny ?? Number.NaN); }}
            />
            <Pole
              etykieta="Godziny na zimę"
              jednostka="h"
              liczba
              value={godzinyTekst}
              onChangeText={setGodzinyTekst}
              accessibilityLabel="Godziny na zimę"
            />
            {zaznaczony && godziny !== zapisane ? (
              <Przycisk maly wariant="drugi" tekst="Zapisz godziny" onPress={() => { void zapiszGodziny(godziny ?? Number.NaN); }} />
            ) : null}
            {blad ? <Text style={[TYPOGRAFIA.opis, { color: theme.colors.danger }]}>{blad}</Text> : null}
            {(godziny ?? 0) > p.nadgodziny ? (
              <Text style={[TYPOGRAFIA.opis, { color: theme.colors.danger }]}>
                W tym miesiącu jest {h(p.nadgodziny)} nadgodzin – odkładasz więcej, niż wypracowano.
              </Text>
            ) : null}
            {zaznaczony ? (
              <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>
                Wypłata −{zl(p.odlozenie.wynagrodzenie)} · koszt pracodawcy −{zl(p.odlozenie.koszt)} (stawka nadgodziny z {dataKrotko(ostatniDzienMiesiaca(miesiac))})
              </Text>
            ) : null}
          </Sekcja>
        ) : (
          <Przycisk wariant="tekst" ikona="plus" tekst="Odłóż nadgodziny na zimę (R8)" onPress={() => setRozwiniete(true)} />
        )}

        <Sekcja tytul="Raporty" info="Dotknij raportu, żeby go edytować.">
          {raportyOdNajnowszych.length === 0 ? (
            <View style={{ gap: ODSTEP.m }}>
              <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>W tym miesiącu nie ma raportów.</Text>
              <Przycisk tekst="Wróć do raportów" wariant="drugi" onPress={() => wstecz(powrot)} />
            </View>
          ) : raportyOdNajnowszych.map((r) => {
            const rodzaj = rodzajRaportu(r);
            const otworz = () => router.push({ pathname: '/budzet/pracownicy/[id]/raport', params: { id: pracownik.id, raportId: r.id } } as never);
            if (rodzaj !== 'praca') {
              return (
                <Karta
                  key={r.id}
                  tytul={wielkaLitera(formatujDzienIso(r.data))}
                  podtytul={`${rodzaj} – ${nazwaNieobecnosci(rodzaj).toLowerCase()} · ${nazwaBrygady(grupy, r.grupaId ?? pracownik.grupaId)}`}
                  znaczek={{ tekst: rodzaj, kolor: rodzaj === 'L4' ? theme.colors.danger : rodzaj === 'UW' ? theme.colors.info : rodzaj === 'R8' ? theme.colors.primary : theme.colors.textSecondary }}
                  podsumowanie={`Wypłata ${zl(r.wynagrodzenie)} · koszt ${zl(r.kwota)}`}
                  accessibilityLabel={`Raport ${r.data}`}
                  onPress={otworz}
                >
                  {(wzory.get(r.id)?.linie ?? []).map((linia: string) => (
                    <Text key={linia} style={[TYPOGRAFIA.opis, { color: theme.colors.text }]}>{linia}</Text>
                  ))}
                  {r.uwagi ? <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>{r.uwagi}</Text> : null}
                </Karta>
              );
            }
            const dojazd = dojazdRaportu(r);
            const wynik = kwotaPracownika(r.stawki, r.godzinyPodstawowe, r.nadgodziny, dojazd, r.delegacja);
            return (
              <Karta
                key={r.id}
                tytul={wielkaLitera(formatujDzienIso(r.data))}
                podtytul={`${nazwaPozycji('budowa', r.budowaId)} · ${h(r.godziny)}${r.delegacja ? ' · delegacja' : ''}`}
                podsumowanie={`Wypłata ${zl(round2(r.wynagrodzenie))} · koszt ${zl(r.kwota)}`}
                accessibilityLabel={`Raport ${r.data}`}
                onPress={otworz}
              >
                {liniePodsumowania(r.stawki, r.godzinyPodstawowe, r.nadgodziny, dojazd, wynik).map((linia) => (
                  <Text key={linia} style={[TYPOGRAFIA.opis, { color: theme.colors.text }]}>{linia}</Text>
                ))}
                {r.uwagi ? <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>{r.uwagi}</Text> : null}
              </Karta>
            );
          })}
        </Sekcja>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24 },
  tresc: { padding: ODSTEP.l, gap: ODSTEP.m },
  kwoty: { flexDirection: 'row', gap: ODSTEP.m, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: ODSTEP.m, marginTop: ODSTEP.s },
  kwota: { flex: 1, gap: 2 },
  pozycja: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.m, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: ODSTEP.s },
});
