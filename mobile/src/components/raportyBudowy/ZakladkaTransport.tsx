import React, { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { Etykieta, Karta, Pole, Przycisk, Sekcja, SiatkaDanych, Wiersz, Wybor, useMotyw, ODSTEP, TYPOGRAFIA, stylFormularza } from '../ui';
import { SafeModal } from '../common/SafeModal';
import { parsujLiczbePola } from '../../budzet/rozliczenie';
import { formatLiczby } from '../../utils/calculations';
import { potwierdzAkcje } from '../../utils/dialog';
import {
  OPISY_ROZLICZENIA_SAMOCHODOW, kwotaPrzerzutu, kwotaSamochodow, kwotaTransportu, linkTrasy, przerobRaportu, sumaPrzerobu,
  wzorSamochodow,
} from '../../raportyBudowy/raporty';
import { generujIdRaportu } from '../../stores/raportyBudowyStore';
import { useFirmyStore } from '../../stores/firmyStore';
import type { Przerzut, RaportDzienny, RozliczenieSamochodu, TypSamochodu, WpisSamochodow } from '../../raportyBudowy/typy';
import { PoleFirmy } from './wspolne';

const TYPY: [TypSamochodu, string][] = [['wanna', 'Wanna'], ['oska', 'Ośka']];
const nazwaTypu = (t: TypSamochodu) => TYPY.find(([id]) => id === t)?.[1] ?? t;
const tekst = (n?: number) => (n ? String(n).replace('.', ',') : '');

const otworzLink = (url?: string) => {
  if (url) void Linking.openURL(url);
};

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
  const [stawka, setStawka] = useState('');
  const [km, setKm] = useState('');
  const [trasa, setTrasa] = useState('');
  const [mapaUrl, setMapaUrl] = useState('');
  const [ladunek, setLadunek] = useState('');
  const [zbiorczo, setZbiorczo] = useState(false);
  const [typ, setTyp] = useState<TypSamochodu>('wanna');
  const [kursy, setKursy] = useState('');
  const [rozliczenie, setRozliczenie] = useState<RozliczenieSamochodu>('kurs');
  const [tony, setTony] = useState('');

  const tonyPrzerobu = sumaPrzerobu(przerobRaportu(raport)).ilosc;

  const otworzPrzerzut = (wpis?: Przerzut) => {
    setBlad('');
    setFirma(wpis?.firma ?? ''); setStawka(tekst(wpis?.stawka)); setKm(tekst(wpis?.km));
    setTrasa(wpis?.trasa ?? ''); setMapaUrl(wpis?.mapaUrl ?? ''); setLadunek(wpis?.ladunek ?? '');
    setOkno({ rodzaj: 'przerzut', wpis });
  };

  const otworzSamochody = (wpis?: WpisSamochodow) => {
    setBlad('');
    setZbiorczo(wpis ? !wpis.firma : false);
    setFirma(wpis?.firma ?? ''); setTyp(wpis?.typ ?? 'wanna'); setKursy(wpis ? String(wpis.kursy) : '');
    setRozliczenie(wpis?.rozliczenie ?? 'kurs'); setStawka(tekst(wpis?.stawka)); setKm(tekst(wpis?.km));
    setTony(wpis ? tekst(wpis.tony) : tekst(tonyPrzerobu));
    setOkno({ rodzaj: 'samochody', wpis });
  };

  const szkicSamochodow = (): Omit<WpisSamochodow, 'id'> => ({
    ...(zbiorczo || !firma.trim() ? {} : { firma: firma.trim() }),
    typ,
    kursy: Math.round(parsujLiczbePola(kursy) ?? 0),
    rozliczenie,
    stawka: parsujLiczbePola(stawka) ?? 0,
    ...(rozliczenie !== 'kurs' ? { km: parsujLiczbePola(km) ?? 0 } : {}),
    ...(rozliczenie === 'tkm' ? { tony: parsujLiczbePola(tony) ?? 0 } : {}),
  });

  const zapisz = () => {
    if (!okno) return;
    const st = parsujLiczbePola(stawka) ?? 0;
    const kmL = parsujLiczbePola(km) ?? 0;
    if (okno.rodzaj === 'przerzut') {
      if (!firma.trim()) { setBlad('Podaj firmę.'); return; }
      if (!(st > 0)) { setBlad('Podaj stawkę.'); return; }
      if (!(kmL > 0)) { setBlad('Podaj kilometry.'); return; }
      const wpis: Przerzut = {
        id: okno.wpis?.id ?? generujIdRaportu(),
        firma: firma.trim(),
        stawka: st,
        km: kmL,
        trasa: trasa.trim(),
        ...(mapaUrl.trim() ? { mapaUrl: mapaUrl.trim() } : {}),
        ladunek: ladunek.trim(),
      };
      void znajdzLubDodajFirme(wpis.firma);
      onZmien({ przerzuty: okno.wpis ? raport.przerzuty.map((p) => (p.id === wpis.id ? wpis : p)) : [...raport.przerzuty, wpis] });
      setOkno(null);
      return;
    }
    const szkic = szkicSamochodow();
    if (!zbiorczo && !szkic.firma) { setBlad('Podaj przewoźnika albo wybierz „Zbiorczo”.'); return; }
    if (!(szkic.kursy > 0)) { setBlad('Podaj ilość kursów.'); return; }
    if (!(szkic.stawka > 0)) { setBlad('Podaj stawkę.'); return; }
    if (rozliczenie !== 'kurs' && !(kmL > 0)) { setBlad('Podaj kilometry.'); return; }
    if (rozliczenie === 'tkm' && !((szkic.tony ?? 0) > 0)) { setBlad('Podaj ilość ton.'); return; }
    const wpis: WpisSamochodow = { ...szkic, id: okno.wpis?.id ?? generujIdRaportu() };
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
  const podglad = okno?.rodzaj === 'samochody' ? szkicSamochodow() : undefined;

  return (
    <View style={{ gap: ODSTEP.m }}>
      <Sekcja tytul="Dodaj transport" info="Przerzut – przewiezienie sprzętu (stawka × km). Samochody – dowóz mieszanki zbiorczo albo osobno dla każdego przewoźnika.">
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
              podtytul={[p.trasa, p.ladunek ? `Ładunek: ${p.ladunek}` : ''].filter(Boolean).join('\n')}
              podsumowanie={`${formatLiczby(p.stawka)} zł/km × ${formatLiczby(p.km)} km = ${formatLiczby(kwotaPrzerzutu(p))} zł`}
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
              podtytul={`${OPISY_ROZLICZENIA_SAMOCHODOW.find((o) => o.id === s.rozliczenie)?.nazwa} · ${s.kursy} kursów`}
              podsumowanie={wzorSamochodow(s)}
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
              <Wiersz>
                <Pole etykieta="Stawka" jednostka="zł/km" liczba value={stawka} onChangeText={setStawka} accessibilityLabel="Stawka przerzutu" />
                <Pole etykieta="Kilometry" jednostka="km" liczba value={km} onChangeText={setKm} accessibilityLabel="Kilometry przerzutu" />
              </Wiersz>
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
              <Text style={[TYPOGRAFIA.podsumowanie, { color: theme.colors.primary }]}>
                Kwota: {formatLiczby(kwotaPrzerzutu({ stawka: parsujLiczbePola(stawka) ?? 0, km: parsujLiczbePola(km) ?? 0 }))} zł
              </Text>
            </>
          ) : okno?.rodzaj === 'samochody' && podglad ? (
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
              <View>
                <Etykieta tekst="Rozliczenie" />
                <View style={stylFormularza.chipy}>
                  {OPISY_ROZLICZENIA_SAMOCHODOW.map((o) => (
                    <Wybor key={o.id} zaznaczony={rozliczenie === o.id} etykieta={o.nazwa} accessibilityLabel={`Rozliczenie ${o.nazwa}`} onPress={() => setRozliczenie(o.id)} />
                  ))}
                </View>
              </View>
              <Wiersz>
                <Pole
                  etykieta="Stawka"
                  jednostka={OPISY_ROZLICZENIA_SAMOCHODOW.find((o) => o.id === rozliczenie)?.jednostka}
                  liczba
                  value={stawka}
                  onChangeText={setStawka}
                  accessibilityLabel="Stawka samochodów"
                />
                {rozliczenie !== 'kurs' ? (
                  <Pole etykieta="Km / kurs" jednostka="km" liczba value={km} onChangeText={setKm} info="Długość jednego kursu." accessibilityLabel="Kilometry na kurs" />
                ) : null}
              </Wiersz>
              {rozliczenie === 'tkm' ? (
                <Pole
                  etykieta="Ilość ton"
                  jednostka="t"
                  liczba
                  value={tony}
                  onChangeText={setTony}
                  info="Podpowiedź: ilość z przerobu tego dnia. Dla kilku przewoźników wpisz tony każdego z nich."
                  accessibilityLabel="Ilość ton"
                />
              ) : null}
              <Text style={[TYPOGRAFIA.podsumowanie, { color: theme.colors.primary }]}>{wzorSamochodow(podglad)}</Text>
            </>
          ) : null}
          {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        </ScrollView>
      </SafeModal>
    </View>
  );
}
