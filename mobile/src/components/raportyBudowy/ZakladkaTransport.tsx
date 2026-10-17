import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Etykieta, Karta, Naciskany, Pole, Przycisk, Sekcja, SiatkaDanych, Wiersz, Wybor, useMotyw, ODSTEP, PROMIEN, TYPOGRAFIA,
  stylFormularza,
} from '../ui';
import { SafeModal } from '../common/SafeModal';
import { parsujLiczbePola } from '../../budzet/rozliczenie';
import { formatLiczby } from '../../utils/calculations';
import { potwierdzAkcje } from '../../utils/dialog';
import {
  OPISY_ROZLICZENIA_TRANSPORTU, RODZAJE_PRZERZUTU, kwotaPrzerzutu, kwotaRozliczeniaTransportu, kwotaSamochodow,
  kwotaTransportu, linkTrasy, nazwaRozliczeniaTransportu, przerobRaportu, rozliczeniaPrzerzutu, rozliczeniaSamochodow,
  sumaPrzerobu, wzorRozliczeniaTransportu,
} from '../../raportyBudowy/raporty';
import { generujIdRaportu } from '../../stores/raportyBudowyStore';
import { useFirmyStore } from '../../stores/firmyStore';
import type {
  Przerzut, RaportDzienny, RodzajRozliczeniaTransportu, RozliczenieTransportu, TypSamochodu, WpisSamochodow,
} from '../../raportyBudowy/typy';
import { PoleFirmy } from './wspolne';

const TYPY: [TypSamochodu, string][] = [['wanna', 'Wanna'], ['oska', 'Ośka']];
const nazwaTypu = (t: TypSamochodu) => TYPY.find(([id]) => id === t)?.[1] ?? t;
const tekst = (n?: number) => (n ? String(n).replace('.', ',') : '');
const RODZAJE_SAMOCHODOW = OPISY_ROZLICZENIA_TRANSPORTU.map((o) => o.id);

const otworzLink = (url?: string) => {
  if (url) void Linking.openURL(url);
};

interface SzkicRozliczenia {
  stawka: string;
  km: string;
  tony: string;
  godziny: string;
}
type Szkice = Partial<Record<RodzajRozliczeniaTransportu, SzkicRozliczenia>>;

const pustySzkic = (tony = ''): SzkicRozliczenia => ({ stawka: '', km: '', tony, godziny: '' });

function szkiceZ(rozliczenia: RozliczenieTransportu[]): Szkice {
  const wynik: Szkice = {};
  for (const r of rozliczenia) {
    wynik[r.rodzaj] = { stawka: tekst(r.stawka), km: tekst(r.km), tony: tekst(r.tony), godziny: tekst(r.godziny) };
  }
  return wynik;
}

function rozliczeniaZ(szkice: Szkice, kolejnosc: RodzajRozliczeniaTransportu[]): RozliczenieTransportu[] {
  return kolejnosc.filter((r) => szkice[r]).map((rodzaj) => {
    const s = szkice[rodzaj]!;
    return {
      rodzaj,
      stawka: parsujLiczbePola(s.stawka) ?? 0,
      ...(rodzaj === 'km' || rodzaj === 'tkm' ? { km: parsujLiczbePola(s.km) ?? 0 } : {}),
      ...(rodzaj === 'tkm' ? { tony: parsujLiczbePola(s.tony) ?? 0 } : {}),
      ...(rodzaj === 'godz' ? { godziny: parsujLiczbePola(s.godziny) ?? 0 } : {}),
    };
  });
}

function bladRozliczen(rozliczenia: RozliczenieTransportu[]): string | undefined {
  if (rozliczenia.length === 0) return 'Zaznacz choć jeden rodzaj rozliczenia.';
  for (const r of rozliczenia) {
    const nazwa = nazwaRozliczeniaTransportu(r.rodzaj);
    if (!(r.stawka > 0)) return `Podaj stawkę: ${nazwa}.`;
    if ((r.rodzaj === 'km' || r.rodzaj === 'tkm') && !((r.km ?? 0) > 0)) return `Podaj kilometry: ${nazwa}.`;
    if (r.rodzaj === 'tkm' && !((r.tony ?? 0) > 0)) return 'Podaj ilość ton.';
    if (r.rodzaj === 'godz' && !((r.godziny ?? 0) > 0)) return 'Podaj ilość godzin.';
  }
  return undefined;
}

/** Pola wyboru rozliczeń ☑/☐ – zaznaczone pozycje sumują się w jednym wpisie transportu. */
function EdytorRozliczen({ rodzaje, szkice, onZmien, kursy, etykietaKm, tonyPodpowiedz }: {
  rodzaje: RodzajRozliczeniaTransportu[];
  szkice: Szkice;
  onZmien: (s: Szkice) => void;
  /** Samochody – liczba kursów; przerzut – brak (jeden przejazd). */
  kursy?: number;
  etykietaKm: string;
  tonyPodpowiedz: string;
}) {
  const theme = useMotyw();
  const zmien = (rodzaj: RodzajRozliczeniaTransportu, pole: keyof SzkicRozliczenia, v: string) =>
    onZmien({ ...szkice, [rodzaj]: { ...(szkice[rodzaj] ?? pustySzkic()), [pole]: v } });
  const przelacz = (rodzaj: RodzajRozliczeniaTransportu) => {
    const { [rodzaj]: jest, ...reszta } = szkice;
    onZmien(jest ? reszta : { ...szkice, [rodzaj]: pustySzkic(rodzaj === 'tkm' ? tonyPodpowiedz : '') });
  };
  return (
    <View style={{ gap: ODSTEP.s }}>
      <Etykieta
        tekst="Rozliczenie"
        wymagane
        info="Zaznacz jeden albo kilka rodzajów – kwoty się sumują (np. stawka za kurs + godziny postoju)."
      />
      {rodzaje.map((rodzaj) => {
        const opis = OPISY_ROZLICZENIA_TRANSPORTU.find((o) => o.id === rodzaj)!;
        const s = szkice[rodzaj];
        const r = s ? rozliczeniaZ({ [rodzaj]: s }, [rodzaj])[0] : undefined;
        return (
          <View key={rodzaj} style={[styles.blok, { borderColor: s ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.card }]}>
            <Naciskany accessibilityRole="checkbox" accessibilityState={{ checked: !!s }} accessibilityLabel={`Rozliczenie ${opis.nazwa}`} onPress={() => przelacz(rodzaj)} style={styles.check}>
              <Text style={[styles.ptaszek, { color: theme.colors.primary }]}>{s ? '☑' : '☐'}</Text>
              <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text, flex: 1 }]}>{opis.nazwa}</Text>
              {r ? <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]}>{formatLiczby(kwotaRozliczeniaTransportu(r, kursy ?? 1))} zł</Text> : null}
            </Naciskany>
            {s && r ? (
              <>
                <Wiersz>
                  <Pole
                    etykieta="Stawka"
                    jednostka={opis.jednostka}
                    liczba
                    value={s.stawka}
                    onChangeText={(v) => zmien(rodzaj, 'stawka', v)}
                    accessibilityLabel={`Stawka ${opis.nazwa}`}
                  />
                  {rodzaj === 'km' || rodzaj === 'tkm' ? (
                    <Pole etykieta={etykietaKm} jednostka="km" liczba value={s.km} onChangeText={(v) => zmien(rodzaj, 'km', v)} accessibilityLabel={`Kilometry ${opis.nazwa}`} />
                  ) : null}
                  {rodzaj === 'godz' ? (
                    <Pole etykieta="Ilość godzin" jednostka="h" liczba value={s.godziny} onChangeText={(v) => zmien(rodzaj, 'godziny', v)} accessibilityLabel="Ilość godzin" />
                  ) : null}
                </Wiersz>
                {rodzaj === 'tkm' ? (
                  <Pole
                    etykieta="Ilość ton"
                    jednostka="t"
                    liczba
                    value={s.tony}
                    onChangeText={(v) => zmien(rodzaj, 'tony', v)}
                    info="Podpowiedź: ilość z przerobu tego dnia. Dla kilku przewoźników wpisz tony każdego z nich."
                    accessibilityLabel="Ilość ton"
                  />
                ) : null}
                <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>{wzorRozliczeniaTransportu(r, kursy)}</Text>
              </>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

type Okno = { rodzaj: 'przerzut'; wpis?: Przerzut } | { rodzaj: 'samochody'; wpis?: WpisSamochodow };

export function ZakladkaTransport({ raport, onZmien }: {
  raport: RaportDzienny;
  onZmien: (zmiany: Partial<RaportDzienny>) => void;
}) {
  const theme = useMotyw();
  const znajdzLubDodajFirme = useFirmyStore((s) => s.znajdzLubDodaj);
  const [okno, setOkno] = useState<Okno | null>(null);
  const [blad, setBlad] = useState('');
  const [firma, setFirma] = useState('');
  const [szkice, setSzkice] = useState<Szkice>({});
  const [trasa, setTrasa] = useState('');
  const [mapaUrl, setMapaUrl] = useState('');
  const [ladunek, setLadunek] = useState('');
  const [zbiorczo, setZbiorczo] = useState(false);
  const [typ, setTyp] = useState<TypSamochodu>('wanna');
  const [kursy, setKursy] = useState('');

  const tonyPrzerobu = tekst(sumaPrzerobu(przerobRaportu(raport)).ilosc);
  const kursyL = Math.round(parsujLiczbePola(kursy) ?? 0);

  const otworzPrzerzut = (wpis?: Przerzut) => {
    setBlad('');
    setFirma(wpis?.firma ?? '');
    setSzkice(wpis ? szkiceZ(rozliczeniaPrzerzutu(wpis)) : { km: pustySzkic() });
    setTrasa(wpis?.trasa ?? ''); setMapaUrl(wpis?.mapaUrl ?? ''); setLadunek(wpis?.ladunek ?? '');
    setOkno({ rodzaj: 'przerzut', wpis });
  };

  const otworzSamochody = (wpis?: WpisSamochodow) => {
    setBlad('');
    setZbiorczo(wpis ? !wpis.firma : false);
    setFirma(wpis?.firma ?? ''); setTyp(wpis?.typ ?? 'wanna'); setKursy(wpis ? String(wpis.kursy) : '');
    setSzkice(wpis ? szkiceZ(rozliczeniaSamochodow(wpis)) : { kurs: pustySzkic() });
    setOkno({ rodzaj: 'samochody', wpis });
  };

  const zapisz = () => {
    if (!okno) return;
    if (okno.rodzaj === 'przerzut') {
      if (!firma.trim()) { setBlad('Podaj firmę.'); return; }
      const rozliczenia = rozliczeniaZ(szkice, RODZAJE_PRZERZUTU);
      const b = bladRozliczen(rozliczenia);
      if (b) { setBlad(b); return; }
      const wpis: Przerzut = {
        id: okno.wpis?.id ?? generujIdRaportu(),
        firma: firma.trim(),
        rozliczenia,
        trasa: trasa.trim(),
        ...(mapaUrl.trim() ? { mapaUrl: mapaUrl.trim() } : {}),
        ladunek: ladunek.trim(),
      };
      void znajdzLubDodajFirme(wpis.firma);
      onZmien({ przerzuty: okno.wpis ? raport.przerzuty.map((p) => (p.id === wpis.id ? wpis : p)) : [...raport.przerzuty, wpis] });
      setOkno(null);
      return;
    }
    if (!zbiorczo && !firma.trim()) { setBlad('Podaj przewoźnika albo wybierz „Zbiorczo”.'); return; }
    const rozliczenia = rozliczeniaZ(szkice, RODZAJE_SAMOCHODOW);
    const potrzebaKursow = rozliczenia.some((r) => r.rodzaj === 'km' || r.rodzaj === 'kurs');
    if (potrzebaKursow && !(kursyL > 0)) { setBlad('Podaj ilość kursów.'); return; }
    const b = bladRozliczen(rozliczenia);
    if (b) { setBlad(b); return; }
    const wpis: WpisSamochodow = {
      id: okno.wpis?.id ?? generujIdRaportu(),
      ...(zbiorczo ? {} : { firma: firma.trim() }),
      typ,
      kursy: kursyL,
      rozliczenia,
    };
    if (wpis.firma) void znajdzLubDodajFirme(wpis.firma);
    onZmien({ samochody: okno.wpis ? raport.samochody.map((s) => (s.id === wpis.id ? wpis : s)) : [...raport.samochody, wpis] });
    setOkno(null);
  };

  const usunPrzerzut = (p: Przerzut) => potwierdzAkcje('Usunąć przerzut?', `${p.firma}${p.trasa ? ` · ${p.trasa}` : ''}`, () => {
    onZmien({ przerzuty: raport.przerzuty.filter((x) => x.id !== p.id) });
  });
  const usunSamochody = (s: WpisSamochodow) => potwierdzAkcje('Usunąć wpis?', s.firma ?? 'Zbiorczo', () => {
    onZmien({ samochody: raport.samochody.filter((x) => x.id !== s.id) });
  });

  const sumaPrzerzutow = raport.przerzuty.reduce((s, p) => s + kwotaPrzerzutu(p), 0);
  const sumaSamochodow = raport.samochody.reduce((s, w) => s + kwotaSamochodow(w), 0);
  const kwotaOkna = okno?.rodzaj === 'przerzut'
    ? rozliczeniaZ(szkice, RODZAJE_PRZERZUTU).reduce((s, r) => s + kwotaRozliczeniaTransportu(r, 1), 0)
    : rozliczeniaZ(szkice, RODZAJE_SAMOCHODOW).reduce((s, r) => s + kwotaRozliczeniaTransportu(r, kursyL), 0);

  return (
    <View style={{ gap: ODSTEP.m }}>
      <Sekcja tytul="Dodaj transport" info="Przerzut – przewiezienie sprzętu. Samochody – dowóz mieszanki zbiorczo albo osobno dla każdego przewoźnika. W jednym wpisie można połączyć kilka rodzajów rozliczenia.">
        <Wiersz>
          <Przycisk tekst="Przerzut" ikona="plus" wariant="drugi" onPress={() => otworzPrzerzut()} accessibilityLabel="Dodaj przerzut" />
          <Przycisk tekst="Samochody" ikona="plus" wariant="drugi" onPress={() => otworzSamochody()} accessibilityLabel="Dodaj samochody" />
        </Wiersz>
      </Sekcja>

      {raport.przerzuty.length > 0 ? (
        <Sekcja tytul="Przerzuty">
          {raport.przerzuty.map((p) => (
            <Karta
              key={p.id}
              tytul={p.firma}
              podtytul={[p.trasa, p.ladunek ? `Ładunek: ${p.ladunek}` : '', ...rozliczeniaPrzerzutu(p).map((r) => wzorRozliczeniaTransportu(r))].filter(Boolean).join('\n')}
              podsumowanie={`Razem ${formatLiczby(kwotaPrzerzutu(p))} zł`}
              akcje={[
                ...(p.mapaUrl || linkTrasy(p.trasa) ? [{ tekst: 'Mapa', onPress: () => otworzLink(p.mapaUrl ?? linkTrasy(p.trasa)), accessibilityLabel: `Mapa przerzutu ${p.firma}` }] : []),
                { tekst: 'Edytuj', onPress: () => otworzPrzerzut(p), accessibilityLabel: `Edytuj przerzut ${p.firma}` },
                { tekst: 'Usuń', rodzaj: 'niebezpieczna' as const, onPress: () => usunPrzerzut(p), accessibilityLabel: `Usuń przerzut ${p.firma}` },
              ]}
            />
          ))}
        </Sekcja>
      ) : null}

      {raport.samochody.length > 0 ? (
        <Sekcja tytul="Samochody">
          {raport.samochody.map((s) => (
            <Karta
              key={s.id}
              tytul={s.firma ?? 'Zbiorczo'}
              znaczek={{ tekst: nazwaTypu(s.typ), kolor: theme.colors.info }}
              podtytul={[`${s.kursy} kursów`, ...rozliczeniaSamochodow(s).map((r) => `${nazwaRozliczeniaTransportu(r.rodzaj)}: ${wzorRozliczeniaTransportu(r, s.kursy)}`)].join('\n')}
              podsumowanie={`Razem ${formatLiczby(kwotaSamochodow(s))} zł`}
              akcje={[
                { tekst: 'Edytuj', onPress: () => otworzSamochody(s), accessibilityLabel: `Edytuj samochody ${s.firma ?? 'zbiorczo'}` },
                { tekst: 'Usuń', rodzaj: 'niebezpieczna' as const, onPress: () => usunSamochody(s), accessibilityLabel: `Usuń samochody ${s.firma ?? 'zbiorczo'}` },
              ]}
            />
          ))}
        </Sekcja>
      ) : null}

      <Sekcja tytul="Kwota transportu">
        <SiatkaDanych
          pozycje={[
            { etykieta: 'Przerzuty', wartosc: `${formatLiczby(sumaPrzerzutow)} zł` },
            { etykieta: 'Samochody', wartosc: `${formatLiczby(sumaSamochodow)} zł` },
          ]}
        />
        <Text accessibilityLabel="Kwota transportu" style={[TYPOGRAFIA.duza, { color: theme.colors.text, textAlign: 'right' }]}>
          Razem {formatLiczby(kwotaTransportu(raport))} zł
        </Text>
      </Sekcja>

      <SafeModal
        visible={!!okno}
        tytul={okno?.rodzaj === 'przerzut' ? (okno.wpis ? 'Edytuj przerzut' : 'Przerzut') : okno?.wpis ? 'Edytuj samochody' : 'Samochody'}
        theme={theme}
        onClose={() => setOkno(null)}
        prawy={{ tekst: 'Zapisz', onPress: zapisz, kolor: theme.colors.primary }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={stylFormularza.tresc}>
          {okno?.rodzaj === 'przerzut' ? (
            <>
              <PoleFirmy value={firma} onChangeText={setFirma} />
              <Pole
                etykieta="Trasa"
                value={trasa}
                onChangeText={setTrasa}
                placeholder="np. Inowrocław - Mąkowarsko"
                info="Miejscowości oddzielone myślnikiem. Przycisk niżej pokaże trasę w Google Maps."
                accessibilityLabel="Trasa przerzutu"
              />
              {linkTrasy(trasa) ? (
                <Przycisk tekst="Pokaż trasę w Google Maps" ikona="mapa" wariant="tekst" onPress={() => otworzLink(linkTrasy(trasa))} />
              ) : null}
              <Pole
                etykieta="Link do mapy z pinezkami"
                value={mapaUrl}
                onChangeText={setMapaUrl}
                klawiatura="url"
                placeholder="https://maps.app.goo.gl/…"
                info="Zaznacz pinezki w Google Maps, wybierz Udostępnij → Kopiuj link i wklej tutaj. Link zapisze się w raporcie."
                accessibilityLabel="Link do mapy"
              />
              {mapaUrl.trim() ? <Przycisk tekst="Otwórz mapę" ikona="mapa" wariant="tekst" onPress={() => otworzLink(mapaUrl.trim())} /> : null}
              <Pole etykieta="Ładunek" value={ladunek} onChangeText={setLadunek} placeholder="np. rozściełacz, walec" accessibilityLabel="Ładunek przerzutu" />
              <EdytorRozliczen rodzaje={RODZAJE_PRZERZUTU} szkice={szkice} onZmien={setSzkice} etykietaKm="Kilometry" tonyPodpowiedz="" />
            </>
          ) : okno?.rodzaj === 'samochody' ? (
            <>
              <View>
                <Etykieta tekst="Wpis" info="Zbiorczo – wszystkie samochody jedną pozycją. Przewoźnik – osobna stawka i kilometry dla każdej firmy." />
                <Wiersz>
                  <Wybor wysrodkuj zaznaczony={!zbiorczo} etykieta="Przewoźnik" onPress={() => setZbiorczo(false)} />
                  <Wybor wysrodkuj zaznaczony={zbiorczo} etykieta="Zbiorczo" onPress={() => setZbiorczo(true)} />
                </Wiersz>
              </View>
              {!zbiorczo ? <PoleFirmy value={firma} onChangeText={setFirma} etykieta="Przewoźnik" /> : null}
              <Wiersz>
                <View>
                  <Etykieta tekst="Typ" />
                  <Wiersz>
                    {TYPY.map(([id, nazwa]) => (
                      <Wybor key={id} wysrodkuj zaznaczony={typ === id} etykieta={nazwa} accessibilityLabel={`Typ ${nazwa}`} onPress={() => setTyp(id)} />
                    ))}
                  </Wiersz>
                </View>
                <Pole etykieta="Ilość kursów" liczba value={kursy} onChangeText={setKursy} accessibilityLabel="Ilość kursów" />
              </Wiersz>
              <EdytorRozliczen
                rodzaje={RODZAJE_SAMOCHODOW}
                szkice={szkice}
                onZmien={setSzkice}
                kursy={kursyL}
                etykietaKm="Km / kurs"
                tonyPodpowiedz={tonyPrzerobu}
              />
            </>
          ) : null}
          <Text accessibilityLabel="Kwota wpisu" style={[TYPOGRAFIA.podsumowanie, { color: theme.colors.primary, fontSize: 15 }]}>
            Razem: {formatLiczby(kwotaOkna)} zł
          </Text>
          {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        </ScrollView>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  blok: { borderWidth: 1, borderRadius: PROMIEN.m, padding: ODSTEP.s + 2, gap: ODSTEP.s },
  check: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.s },
  ptaszek: { fontSize: 20, fontWeight: '800' },
});
