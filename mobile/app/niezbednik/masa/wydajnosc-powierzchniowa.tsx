// Wydajność powierzchniowa: metry pasa z założonej grubości oraz grubość z faktycznie wbudowanych metrów.
// Każde auto ma własną grubość, szerokość i gęstość. Metry wpisuje się z auta albo od początku odcinka.

import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Przycisk, PrzyciskIkony, RamkaWyniku, Sekcja, SiatkaDanych, Wiersz, WierszDanych, WycinekPola, WycinekWiersz, WycinekWyniku, Zakladki, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { SafeModal } from '../../../src/components/common/SafeModal';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, usePrzewijanieDoStref } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { RysMetryZAuta } from '../../../src/components/niezbednik/RysunkiMasy';
import { WyborMieszanki, nazwaMieszanki } from '../../../src/components/mieszanki/WyborMieszanki';
import { fm, liczbaZTekstu, zeZnakiem } from '../../../src/geodezja/geometria';
import {
  bilansAutMetry, rozwiazMetryOdcinka, wynikAutaMetry,
  type OcenaGrubosci, type PorownanieGrubosci, type TrybMetrowOdcinka, type WarstwaUkladania,
} from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';
import { useMieszankiStore } from '../../../src/stores/mieszankiStore';
import { useWytwornieStore } from '../../../src/stores/wytwornieStore';
import type { Mieszanka } from '../../../src/types';

const ZASADA = 'masa/wydajnosc-powierzchniowa';

interface AutoWpis {
  id: string;
  tonaz: string;
  metry: string;
  tryb: TrybMetrowOdcinka;
  grubosc: string;
  szerokosc: string;
  gestosc: string;
  mieszankaId?: string;
  mieszankaNazwa?: string;
}

const START: AutoWpis = {
  id: 'a1', tonaz: '25,5', metry: '', tryb: 'zAuta', grubosc: '4', szerokosc: '3,65', gestosc: '2,455',
};

function kolorOceny(ocena: OcenaGrubosci, kolory: { success: string; warning: string; danger: string }): string {
  if (ocena === 'grubsza') return kolory.danger;
  if (ocena === 'ciensza') return kolory.warning;
  return kolory.success;
}

function tekstGrubosci(p: PorownanieGrubosci): string {
  const strzalka = p.ocena === 'grubsza' ? ' ▲' : p.ocena === 'ciensza' ? ' ▼' : '';
  return `${fm(p.uzyskanaCm, 2)}${strzalka} / ${fm(p.zalozenaCm, 2)} cm`;
}

function dodatnia(n: number | undefined): number | null {
  return n != null && n > 0 ? n : null;
}

function tekstLiczby(n: number): string {
  const r = Math.round(n * 100) / 100;
  return String(r).replace('.', ',');
}

function warstwaZTekstu(grubosc: string, szerokosc: string, gestosc: string): WarstwaUkladania {
  const g = liczbaZTekstu(grubosc);
  const s = liczbaZTekstu(szerokosc);
  const r = liczbaZTekstu(gestosc);
  return {
    gruboscCm: g != null && g > 0 ? g : 0,
    szerokoscM: s != null && s > 0 ? s : 0,
    gestosc: r != null && r > 0 ? r : 0,
  };
}

export default function WydajnoscPowierzchniowaScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const { przewijanie, widokStrefy } = usePrzewijanieDoStref();
  const licznik = useRef(1);
  const [auta, setAuta] = useState<AutoWpis[]>([START]);
  const [mixDla, setMixDla] = useState<string | null>(null);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const mieszankiZaladowane = useMieszankiStore((s) => s.zaladowane);
  const zaladujMieszanki = useMieszankiStore((s) => s.zaladujMieszanki);
  const wytwornie = useWytwornieStore((s) => s.wytwornie);
  const wytwornieZaladowane = useWytwornieStore((s) => s.zaladowane);
  const zaladujWytwornie = useWytwornieStore((s) => s.zaladujWytwornie);

  useEffect(() => {
    if (!mieszankiZaladowane) void zaladujMieszanki();
    if (!wytwornieZaladowane) void zaladujWytwornie();
  }, [mieszankiZaladowane, wytwornieZaladowane, zaladujMieszanki, zaladujWytwornie]);

  const odczyty = rozwiazMetryOdcinka(auta.map((auto) => ({
    tryb: auto.tryb,
    wpisane: dodatnia(liczbaZTekstu(auto.metry)),
  })));
  const rozliczone = auta.map((auto, indeks) => ({
    auto,
    tonaz: dodatnia(liczbaZTekstu(auto.tonaz)) ?? 0,
    metry: odczyty[indeks]?.zAuta ?? null,
    warstwa: warstwaZTekstu(auto.grubosc, auto.szerokosc, auto.gestosc),
    odczyt: odczyty[indeks],
  }));
  const wyniki = rozliczone.map((wiersz) => wynikAutaMetry({
    tonaz: wiersz.tonaz,
    metryWbudowane: wiersz.metry,
    warstwa: wiersz.warstwa,
  }));
  const bilans = bilansAutMetry(rozliczone.map((wiersz) => ({
    tonaz: wiersz.tonaz,
    metryWbudowane: wiersz.metry,
    warstwa: wiersz.warstwa,
  })));
  const pierwszy = wyniki[0];
  const podgladMetrow = pierwszy && pierwszy.metryZalozenia > 0 ? `${fm(pierwszy.metryZalozenia, 1)} m` : '…';

  const zmienAuto = (id: string, pole: 'tonaz' | 'metry' | 'grubosc' | 'szerokosc' | 'gestosc', wartosc: string) => {
    setAuta((lista) => lista.map((a) => (a.id === id ? { ...a, [pole]: wartosc } : a)));
  };
  const dodajAuto = () => {
    licznik.current += 1;
    setAuta((lista) => {
      const ostatnie = lista[lista.length - 1] ?? START;
      return [...lista, {
        id: `a${licznik.current}`,
        tonaz: '',
        metry: '',
        tryb: 'zAuta',
        grubosc: ostatnie.grubosc,
        szerokosc: ostatnie.szerokosc,
        gestosc: ostatnie.gestosc,
        mieszankaId: ostatnie.mieszankaId,
        mieszankaNazwa: ostatnie.mieszankaNazwa,
      }];
    });
  };
  const usunAuto = (id: string) => {
    setAuta((lista) => (lista.length < 2 ? lista : lista.filter((a) => a.id !== id)));
  };
  const przelaczTryb = (id: string, nowy: TrybMetrowOdcinka) => {
    setAuta((lista) => {
      const rozw = rozwiazMetryOdcinka(lista.map((a) => ({
        tryb: a.tryb,
        wpisane: dodatnia(liczbaZTekstu(a.metry)),
      })));
      return lista.map((a, i) => {
        if (a.id !== id || a.tryb === nowy) return a;
        const cel = nowy === 'odPoczatku' ? rozw[i]?.odPoczatku : rozw[i]?.zAuta;
        return { ...a, tryb: nowy, metry: cel != null && cel > 0 ? tekstLiczby(cel) : a.metry };
      });
    });
  };
  const wczytajMieszanke = (m: Mieszanka) => {
    const wyt = wytwornie.find((w) => w.id === m.wytworniaId)?.nazwa ?? m.wytwórnia;
    const nazwa = wyt ? `${nazwaMieszanki(m)} · ${wyt}` : nazwaMieszanki(m);
    setAuta((lista) => lista.map((a) => (a.id === mixDla ? {
      ...a,
      gestosc: fm(m.ciezarObjetosciowy, 3),
      mieszankaId: m.id,
      mieszankaNazwa: nazwa,
    } : a)));
    setMixDla(null);
  };

  const zapisz = () => {
    if (!(bilans.metryZalozenia > 0) && bilans.uzyskanaCm == null) return;
    const jeden = auta.length === 1 ? rozliczone[0] : undefined;
    const wynikJednego = wyniki[0];
    if (jeden && wynikJednego && wynikJednego.metryZalozenia > 0) {
      const baza = `Wydajność powierzchniowa: ${fm(wynikJednego.metryZalozenia, 1)} m (${fm(jeden.tonaz, 1)} t, ${fm(jeden.warstwa.gruboscCm, 1)} cm × ${fm(jeden.warstwa.szerokoscM, 2)} m)`;
      const porownanie = wynikJednego.porownanie;
      dodaj(
        porownanie && jeden.metry != null
          ? `${baza}. Wbudowano ${fm(jeden.metry, 1)} m → ${fm(porownanie.uzyskanaCm, 2)} cm`
          : baza,
        'Masa i sprzęt',
      );
      return;
    }
    const srednia = bilans.porownanie
      ? `, śr. ${fm(bilans.porownanie.uzyskanaCm, 2)} cm (założenie ${fm(bilans.porownanie.zalozenaCm, 2)} cm)`
      : '';
    dodaj(
      `Metry z tony 1→${auta.length}: ${fm(bilans.tonaz, 1)} t, wbudowano ${fm(bilans.metryWbudowane, 1)} m${srednia}`,
      'Masa i sprzęt',
    );
  };

  const mixAuto = auta.find((a) => a.id === mixDla);

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader tytul="Metry z tony" podtytul="Wydajność powierzchniowa" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} zasada={ZASADA} />
      <ScrollView ref={przewijanie} contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled">
        <ZasadaDzialania
          klucz={ZASADA}
          slajdy={[
            {
              tytul: 'Co liczy ten kalkulator',
              rysunek: <RysMetryZAuta tonaz={rozliczone[0]?.tonaz ? `${fm(rozliczone[0].tonaz, 1)} t` : '? t'} metry={podgladMetrow} />,
              opis: 'Podaje, ile **metrów** pasa wyjdzie z masy na aucie przy założonej grubości i szerokości. Po wpisaniu faktycznych metrów pokazuje uzyskaną grubość obok założenia, jak w LIVE. Każde kolejne auto może mieć inną szerokość i grubość.',
            },
            {
              tytul: 'Warstwa, mieszanka i metry',
              rysunek: (
                <>
                  <WycinekWiersz>
                    <WycinekPola etykieta="Grubość założona" wartosc="4" jednostka="cm" />
                    <WycinekPola etykieta="Szerokość" wartosc="3,65" jednostka="m" />
                  </WycinekWiersz>
                  <WycinekWiersz>
                    <WycinekPola etykieta="Z auta" wartosc="70" jednostka="m" aktywne />
                    <WycinekPola etykieta="Od początku" wartosc="150" jednostka="m" />
                  </WycinekWiersz>
                </>
              ),
              opis: 'Grubość i szerokość ustawiasz przy aucie. **Wczytaj mieszankę** bierze gęstość z recepty zapisanej przy wytwórni. Metry wpisujesz **z auta** albo **od początku odcinka** – drugą wartość program dopisuje sam.',
            },
            {
              tytul: 'Porównaj z założeniem',
              rysunek: (
                <>
                  <WycinekWyniku etykieta="Metry wg założenia" wartosc={podgladMetrow === '…' ? '—' : podgladMetrow} />
                  <WycinekWyniku etykieta="Uzyskana / założona" wartosc="4,12 ▲ / 4,00 cm" kolor={theme.colors.danger} />
                </>
              ),
              opis: '**Metry wg założenia** to długość przy grubości tego auta. Po metrach wbudowanych widać **uzyskaną grubość / założoną**. Od drugiego auta suma **1→N** waży powierzchnią, więc inna szerokość nie psuje średniej.',
            },
          ]}
        />

        {auta.map((auto, indeks) => {
          const wiersz = rozliczone[indeks];
          const wynik = wyniki[indeks];
          const metryOk = wynik != null && wynik.metryZalozenia > 0 && Number.isFinite(wynik.metryZalozenia);
          const porownanie = wynik?.porownanie ?? null;
          const kolor = porownanie ? kolorOceny(porownanie.ocena, theme.colors) : theme.colors.primary;
          const numer = indeks + 1;
          const odPoczatku = wiersz.odczyt?.odPoczatku;
          const zAuta = wiersz.odczyt?.zAuta;
          const masaM2 = wiersz.warstwa.gruboscCm > 0 && wiersz.warstwa.gestosc > 0
            ? (wiersz.warstwa.gruboscCm / 100) * wiersz.warstwa.gestosc * 1000
            : 0;
          return (
            <View key={auto.id} ref={widokStrefy(auto.id)}>
              <StrefaKlawiatury nazwa={auto.id}>
                <Sekcja
                  tytul={`${numer} auto`}
                  info="Grubość i szerokość dotyczą tylko tego auta. Nowe auto dostaje je na start, a potem możesz je zmienić. Metry wpisujesz z auta albo od początku odcinka."
                  prawy={auta.length > 1 ? (
                    <PrzyciskIkony
                      ikona="usun"
                      accessibilityLabel={`Usuń ${numer} auto`}
                      onPress={() => usunAuto(auto.id)}
                      kolor={theme.colors.danger}
                      tlo={`${theme.colors.danger}14`}
                    />
                  ) : undefined}
                >
                  <Zakladki
                    theme={theme}
                    aktywna={auto.tryb}
                    onZmien={(tryb) => przelaczTryb(auto.id, tryb)}
                    zakladki={[['zAuta', 'Z auta'], ['odPoczatku', 'Od początku']]}
                  />
                  <Wiersz>
                    <PoleLiczby
                      etykieta="Grubość założona"
                      value={auto.grubosc}
                      onChangeText={(t) => zmienAuto(auto.id, 'grubosc', t)}
                      jednostka="cm"
                      accessibilityLabel={`Grubość założona ${numer} auto [cm]`}
                    />
                    <PoleLiczby
                      etykieta="Szerokość"
                      value={auto.szerokosc}
                      onChangeText={(t) => zmienAuto(auto.id, 'szerokosc', t)}
                      jednostka="m"
                      accessibilityLabel={`Szerokość ${numer} auto [m]`}
                    />
                  </Wiersz>
                  <Wiersz>
                    <PoleLiczby
                      etykieta="Gęstość"
                      value={auto.gestosc}
                      onChangeText={(t) => zmienAuto(auto.id, 'gestosc', t)}
                      jednostka="t/m³"
                      info="Z recepty po wczytaniu mieszanki. Możesz poprawić ręcznie."
                      accessibilityLabel={`Gęstość ${numer} auto [t/m³]`}
                    />
                    <View />
                  </Wiersz>
                  {auto.mieszankaNazwa ? (
                    <WierszDanych etykieta="Mieszanka" wartosc={auto.mieszankaNazwa} />
                  ) : null}
                  <Przycisk
                    wariant="drugi"
                    maly
                    tekst={auto.mieszankaId ? 'Zmień mieszankę' : 'Wczytaj mieszankę'}
                    accessibilityLabel={`Wczytaj mieszankę ${numer} auto`}
                    onPress={() => setMixDla(auto.id)}
                  />
                  <Wiersz>
                    <PoleLiczby
                      etykieta="Tonaż"
                      value={auto.tonaz}
                      onChangeText={(t) => zmienAuto(auto.id, 'tonaz', t)}
                      jednostka="t"
                      accessibilityLabel={`Tonaż ${numer} auto [t]`}
                    />
                    <PoleLiczby
                      etykieta={auto.tryb === 'zAuta' ? 'Metry z auta' : 'Od początku'}
                      value={auto.metry}
                      onChangeText={(t) => zmienAuto(auto.id, 'metry', t)}
                      jednostka="m"
                      accessibilityLabel={auto.tryb === 'zAuta' ? `Metry z auta ${numer} [m]` : `Od początku odcinka ${numer} [m]`}
                    />
                  </Wiersz>
                  <WierszDanych
                    etykieta={auto.tryb === 'zAuta' ? 'Od początku odcinka' : 'Z tego auta'}
                    wartosc={auto.tryb === 'zAuta'
                      ? (odPoczatku != null && odPoczatku > 0 ? `${fm(odPoczatku, 1)} m` : '—')
                      : (zAuta != null && zAuta > 0 ? `${fm(zAuta, 1)} m` : '—')}
                    kolor={wiersz.odczyt?.przedPoprzednim ? theme.colors.danger : undefined}
                  />
                  {wiersz.odczyt?.przedPoprzednim ? (
                    <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '700' }}>
                      Ta pozycja jest przed końcem poprzedniego auta.
                    </Text>
                  ) : null}
                  <RamkaWyniku
                    etykieta="Metry wg założenia"
                    accessibilityLabel={`Metry wg założenia ${numer}`}
                    wartosc={metryOk && wynik ? `${fm(wynik.metryZalozenia, 1)} m` : '—'}
                  />
                  {wynik && (wynik.powierzchniaM2 > 0 || masaM2 > 0) ? (
                    <SiatkaDanych
                      pozycje={[
                        ...(wynik.powierzchniaM2 > 0 ? [{ etykieta: 'Powierzchnia wg założenia', wartosc: `${fm(wynik.powierzchniaM2, 1)} m²` }] : []),
                        ...(masaM2 > 0 ? [{ etykieta: 'Masa na 1 m²', wartosc: `${fm(masaM2, 1)} kg/m²` }] : []),
                      ]}
                    />
                  ) : null}
                  {porownanie ? (
                    <>
                      <RamkaWyniku
                        etykieta="Uzyskana / założona"
                        accessibilityLabel={`Uzyskana grubość ${numer} auto`}
                        wartosc={tekstGrubosci(porownanie)}
                        kolor={kolor}
                      />
                      <SiatkaDanych
                        pozycje={[{
                          etykieta: 'Różnica grubości',
                          wartosc: `${zeZnakiem(porownanie.roznicaCm, 2)} cm`,
                          kolor,
                        }]}
                      />
                    </>
                  ) : null}
                  <KlawiaturaLiczb />
                </Sekcja>
              </StrefaKlawiatury>
            </View>
          );
        })}

        <Przycisk
          wariant="drugi"
          ikona="plus"
          tekst="Kolejne auto"
          accessibilityLabel="Dodaj kolejne auto"
          onPress={dodajAuto}
        />

        {auta.length > 1 ? (
          <Sekcja
            tytul={`Narastająco · 1→${auta.length}`}
            info="Suma od 1 auta. Średnia grubość waży powierzchnią każdego auta, więc inna szerokość albo gęstość zostaje uwzględniona."
          >
            {bilans.porownanie ? (
              <RamkaWyniku
                etykieta="Średnia grubość"
                accessibilityLabel="Średnia grubość narastająco"
                wartosc={tekstGrubosci(bilans.porownanie)}
                kolor={kolorOceny(bilans.porownanie.ocena, theme.colors)}
              />
            ) : (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                Wpisz metry wbudowane, żeby porównać średnią grubość z założeniem.
              </Text>
            )}
            <SiatkaDanych
              pozycje={[
                { etykieta: 'Łączny tonaż', wartosc: bilans.tonaz > 0 ? `${fm(bilans.tonaz, 2)} t` : '—' },
                { etykieta: 'Metry wbudowane', wartosc: bilans.metryWbudowane > 0 ? `${fm(bilans.metryWbudowane, 1)} m` : '—' },
                { etykieta: 'Metry wg założenia', wartosc: bilans.metryZalozenia > 0 ? `${fm(bilans.metryZalozenia, 1)} m` : '—' },
                ...(bilans.porownanie ? [{
                  etykieta: 'Różnica grubości',
                  wartosc: `${zeZnakiem(bilans.porownanie.roznicaCm, 2)} cm`,
                  kolor: kolorOceny(bilans.porownanie.ocena, theme.colors),
                }] : []),
              ]}
            />
            {bilans.autaDoSredniej > 0 && bilans.autaDoSredniej < auta.length ? (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                {`Średnia z ${bilans.autaDoSredniej} ${bilans.autaDoSredniej === 1 ? 'auta' : 'aut'} z wpisanymi metrami.`}
              </Text>
            ) : null}
          </Sekcja>
        ) : null}

        <Przycisk
          wariant="drugi"
          tekst="Zapisz do Notatnika"
          onPress={zapisz}
        />
      </ScrollView>

      <SafeModal
        visible={mixDla != null}
        tytul="Mieszanka z wytwórni"
        theme={theme}
        onClose={() => setMixDla(null)}
        lewy={{ tekst: 'Zamknij', onPress: () => setMixDla(null) }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
          <WyborMieszanki
            mieszanki={mieszanki}
            zaznaczone={mixAuto?.mieszankaId ? [mixAuto.mieszankaId] : []}
            pustyTekst="Brak recept w bazie. Dodaj mieszanki w kafelku „Mieszanki” i przypnij je do wytwórni."
            onWybierz={wczytajMieszanke}
          />
        </ScrollView>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 14, gap: 12 },
});
