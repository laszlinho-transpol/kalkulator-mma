// Wydajność powierzchniowa: metry pasa z założonej grubości oraz grubość z faktycznie wbudowanych metrów.
// Kilka aut (1 auto, 2 auto, 3 auto) sumuje się narastająco, jak odcinek 1→N w LIVE.

import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Przycisk, PrzyciskIkony, RamkaWyniku, Sekcja, SiatkaDanych, Wiersz, WycinekPola, WycinekWiersz, WycinekWyniku, ZasadaDzialania, useMotyw,
} from '../../../src/components/ui';
import { KlawiaturaLiczb, PoleLiczby, StrefaKlawiatury, usePrzewijanieDoStref } from '../../../src/components/geodezja/KlawiaturaLiczb';
import { RysMetryZAuta } from '../../../src/components/niezbednik/RysunkiMasy';
import { fm, liczbaZTekstu, zeZnakiem } from '../../../src/geodezja/geometria';
import {
  bilansAutMetry, wynikAutaMetry, type OcenaGrubosci, type PorownanieGrubosci, type WarstwaUkladania,
} from '../../../src/utils/kalkulatoryMasiarza';
import { useNotatnikStore } from '../../../src/stores/notatnikStore';

const ZASADA = 'masa/wydajnosc-powierzchniowa';

interface AutoWpis {
  id: string;
  tonaz: string;
  metry: string;
}

function kolorOceny(ocena: OcenaGrubosci, kolory: { success: string; warning: string; danger: string }): string {
  if (ocena === 'grubsza') return kolory.danger;
  if (ocena === 'ciensza') return kolory.warning;
  return kolory.success;
}

/** Jak w LIVE: uzyskana ▲ / założona, strzałka po przekroczeniu 0,2 cm. */
function tekstGrubosci(p: PorownanieGrubosci): string {
  const strzalka = p.ocena === 'grubsza' ? ' ▲' : p.ocena === 'ciensza' ? ' ▼' : '';
  return `${fm(p.uzyskanaCm, 2)}${strzalka} / ${fm(p.zalozenaCm, 2)} cm`;
}

export default function WydajnoscPowierzchniowaScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { dodaj } = useNotatnikStore();
  const { przewijanie, widokStrefy } = usePrzewijanieDoStref();
  const licznik = useRef(1);
  const [grubosc, setGrubosc] = useState('4');
  const [szerokosc, setSzerokosc] = useState('3,65');
  const [gestosc, setGestosc] = useState('2,455');
  const [auta, setAuta] = useState<AutoWpis[]>([{ id: 'a1', tonaz: '25,5', metry: '' }]);

  const g = liczbaZTekstu(grubosc);
  const s = liczbaZTekstu(szerokosc);
  const r = liczbaZTekstu(gestosc);
  const warstwa: WarstwaUkladania = {
    gruboscCm: g != null && g > 0 ? g : 0,
    szerokoscM: s != null && s > 0 ? s : 0,
    gestosc: r != null && r > 0 ? r : 0,
  };
  const rozliczone = auta.map((auto) => {
    const tonaz = liczbaZTekstu(auto.tonaz);
    const metry = liczbaZTekstu(auto.metry);
    return {
      auto,
      tonaz: tonaz != null && tonaz > 0 ? tonaz : 0,
      metry: metry != null && metry > 0 ? metry : null,
    };
  });
  const wyniki = rozliczone.map((wiersz) => wynikAutaMetry(
    { tonaz: wiersz.tonaz, metryWbudowane: wiersz.metry },
    warstwa,
  ));
  const bilans = bilansAutMetry(
    rozliczone.map((wiersz) => ({ tonaz: wiersz.tonaz, metryWbudowane: wiersz.metry })),
    warstwa,
  );
  const pierwszy = wyniki[0];
  const podgladMetrow = pierwszy && pierwszy.metryZalozenia > 0 ? `${fm(pierwszy.metryZalozenia, 1)} m` : '…';
  const masaM2 = warstwa.gruboscCm > 0 && warstwa.gestosc > 0
    ? (warstwa.gruboscCm / 100) * warstwa.gestosc * 1000
    : 0;

  const zmienAuto = (id: string, pole: 'tonaz' | 'metry', wartosc: string) => {
    setAuta((lista) => lista.map((a) => (a.id === id ? { ...a, [pole]: wartosc } : a)));
  };
  const dodajAuto = () => {
    licznik.current += 1;
    setAuta((lista) => [...lista, { id: `a${licznik.current}`, tonaz: '', metry: '' }]);
  };
  const usunAuto = (id: string) => {
    setAuta((lista) => (lista.length < 2 ? lista : lista.filter((a) => a.id !== id)));
  };

  const zapisz = () => {
    if (!(bilans.metryZalozenia > 0) && bilans.uzyskanaCm == null) return;
    if (auta.length === 1 && rozliczone[0] && wyniki[0] && wyniki[0].metryZalozenia > 0 && g != null && s != null) {
      const baza = `Wydajność powierzchniowa: ${fm(wyniki[0].metryZalozenia, 1)} m (${fm(rozliczone[0].tonaz, 1)} t, ${fm(g, 1)} cm × ${fm(s, 2)} m)`;
      const porownanie = wyniki[0].porownanie;
      dodaj(
        porownanie && rozliczone[0].metry != null
          ? `${baza}. Wbudowano ${fm(rozliczone[0].metry, 1)} m → ${fm(porownanie.uzyskanaCm, 2)} cm`
          : baza,
        'Masa i sprzęt',
      );
      return;
    }
    const srednia = bilans.porownanie ? `, śr. ${fm(bilans.porownanie.uzyskanaCm, 2)} cm (założenie ${fm(warstwa.gruboscCm, 2)} cm)` : '';
    dodaj(
      `Metry z tony 1→${auta.length}: ${fm(bilans.tonaz, 1)} t, wbudowano ${fm(bilans.metryWbudowane, 1)} m${srednia}`,
      'Masa i sprzęt',
    );
  };

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
              opis: 'Podaje, ile **metrów bieżących** pasa ułożysz z masy na aucie przy założonej grubości. Po wpisaniu **faktycznie wbudowanych metrów** pokazuje uzyskaną grubość obok założenia – tak jak w LIVE. Kolejne auta liczą się narastająco.',
            },
            {
              tytul: 'Wpisz warstwę i auta',
              rysunek: (
                <>
                  <WycinekWiersz>
                    <WycinekPola etykieta="Grubość założona" wartosc="4" jednostka="cm" />
                    <WycinekPola etykieta="Szerokość" wartosc="3,65" jednostka="m" />
                  </WycinekWiersz>
                  <WycinekWiersz>
                    <WycinekPola etykieta="1 auto · tonaż" wartosc="25,5" jednostka="t" aktywne />
                    <WycinekPola etykieta="Metry wbudowane" wartosc="80" jednostka="m" />
                  </WycinekWiersz>
                </>
              ),
              opis: 'Grubość, szerokość i **gęstość** są wspólne. Każde auto ma tonaż z **WZ** i metry, które naprawdę ułożyłeś. **Kolejne auto** dodaje 2 auto, 3 auto i tak dalej. Puste metry zostawiają sam wynik z założenia.',
            },
            {
              tytul: 'Porównaj z założeniem',
              rysunek: (
                <>
                  <WycinekWyniku etykieta="Metry z auta" wartosc={podgladMetrow === '…' ? '—' : podgladMetrow} />
                  <WycinekWyniku etykieta="Uzyskana / założona" wartosc="4,12 ▲ / 4,00 cm" kolor={theme.colors.danger} />
                </>
              ),
              opis: '**Metry z auta** to długość przy założonej grubości. Po metrach wbudowanych widać **uzyskaną grubość / założoną**. Strzałka ▲ albo ▼ pojawia się po różnicy większej niż 0,2 cm, jak w LIVE. Na dole, od 2 auta, jest suma **1→N**.',
            },
          ]}
        />

        <View ref={widokStrefy('warstwa')}>
          <StrefaKlawiatury nazwa="warstwa">
            <Sekcja
              tytul="Warstwa"
              info="Grubość założona, szerokość i gęstość są wspólne dla wszystkich aut. Grubość założona to ta, z którą porównujesz wynik."
            >
              <Wiersz>
                <PoleLiczby etykieta="Grubość założona" value={grubosc} onChangeText={setGrubosc} jednostka="cm" accessibilityLabel="Grubość założona [cm]" />
                <PoleLiczby etykieta="Szerokość" value={szerokosc} onChangeText={setSzerokosc} jednostka="m" accessibilityLabel="Szerokość układania [m]" />
              </Wiersz>
              <Wiersz>
                <PoleLiczby etykieta="Gęstość" value={gestosc} onChangeText={setGestosc} jednostka="t/m³" accessibilityLabel="Gęstość [t/m³]" />
                <View />
              </Wiersz>
              {masaM2 > 0 ? (
                <SiatkaDanych pozycje={[{ etykieta: 'Masa na 1 m²', wartosc: `${fm(masaM2, 1)} kg/m²` }]} />
              ) : null}
              <KlawiaturaLiczb />
            </Sekcja>
          </StrefaKlawiatury>
        </View>

        {auta.map((auto, indeks) => {
          const wynik = wyniki[indeks];
          const metryOk = wynik != null && wynik.metryZalozenia > 0 && Number.isFinite(wynik.metryZalozenia);
          const porownanie = wynik?.porownanie ?? null;
          const kolor = porownanie ? kolorOceny(porownanie.ocena, theme.colors) : theme.colors.primary;
          const numer = indeks + 1;
          return (
            <View key={auto.id} ref={widokStrefy(auto.id)}>
              <StrefaKlawiatury nazwa={auto.id}>
                <Sekcja
                  tytul={`${numer} auto`}
                  info="Tonaż z WZ tego auta. Metry wbudowane to odcinek, który naprawdę ułożyłeś – z nich wychodzi uzyskana grubość."
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
                  <Wiersz>
                    <PoleLiczby
                      etykieta="Tonaż"
                      value={auto.tonaz}
                      onChangeText={(t) => zmienAuto(auto.id, 'tonaz', t)}
                      jednostka="t"
                      accessibilityLabel={`Tonaż ${numer} auto [t]`}
                    />
                    <PoleLiczby
                      etykieta="Metry wbudowane"
                      value={auto.metry}
                      onChangeText={(t) => zmienAuto(auto.id, 'metry', t)}
                      jednostka="m"
                      placeholder="faktycznie"
                      accessibilityLabel={`Metry wbudowane ${numer} auto [m]`}
                    />
                  </Wiersz>
                  <RamkaWyniku
                    etykieta="Metry z auta"
                    accessibilityLabel={`Metry z auta ${numer}`}
                    wartosc={metryOk && wynik ? `${fm(wynik.metryZalozenia, 1)} m` : '—'}
                  />
                  {wynik && wynik.powierzchniaM2 > 0 ? (
                    <SiatkaDanych pozycje={[{ etykieta: 'Powierzchnia z auta', wartosc: `${fm(wynik.powierzchniaM2, 1)} m²` }]} />
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
            info="Suma od 1 auta. Średnia grubość liczy się tylko z aut, które mają tonaż i metry wbudowane."
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
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: 14, gap: 12 },
});
