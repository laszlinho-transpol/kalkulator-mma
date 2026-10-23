import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Pole, Przycisk, Sekcja, Wiersz, useMotyw, ODSTEP, TYPOGRAFIA, stylFormularza } from '../ui';
import { SafeModal } from '../common/SafeModal';
import { parsujLiczbePola } from '../../budzet/rozliczenie';
import { formatLiczby } from '../../utils/calculations';
import { potwierdzAkcje } from '../../utils/dialog';
import { materialyRaportu, sumaKwot, type WierszMaterialu } from '../../raportyBudowy/raporty';
import { generujIdRaportu } from '../../stores/raportyBudowyStore';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import type { MaterialDodatkowy, RaportDzienny } from '../../raportyBudowy/typy';
import { useFirmyStore } from '../../stores/firmyStore';
import { PoleFirmy, Tabela } from './wspolne';

type Okno =
  | { rodzaj: 'cena'; wiersz: WierszMaterialu }
  | { rodzaj: 'dodatkowy'; material?: MaterialDodatkowy };

const tekst = (n?: number) => (n ? String(n).replace('.', ',') : '');

export function ZakladkaMaterial({ raport, onZmien }: {
  raport: RaportDzienny;
  onZmien: (zmiany: Partial<RaportDzienny>) => void;
}) {
  const theme = useMotyw();
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const wiersze = materialyRaportu(raport, mieszanki);
  const [okno, setOkno] = useState<Okno | null>(null);
  const [cena, setCena] = useState('');
  const [nazwa, setNazwa] = useState('');
  const [ilosc, setIlosc] = useState('');
  const [jednostka, setJednostka] = useState('t');
  const [uwagi, setUwagi] = useState('');
  const [firma, setFirma] = useState('');
  const znajdzLubDodajFirme = useFirmyStore((s) => s.znajdzLubDodaj);
  const [blad, setBlad] = useState('');

  const otworz = (klucz: string) => {
    const w = wiersze.find((x) => x.klucz === klucz);
    if (!w) return;
    setBlad('');
    if (w.dodatkowy) {
      const m = raport.materialyDodatkowe.find((x) => x.id === klucz);
      setNazwa(m?.nazwa ?? ''); setIlosc(tekst(m?.ilosc)); setJednostka(m?.jednostka ?? 't');
      setCena(tekst(m?.cena)); setUwagi(m?.uwagi ?? ''); setFirma(m?.firma ?? '');
      setOkno({ rodzaj: 'dodatkowy', material: m });
    } else {
      setCena(tekst(w.cena));
      setOkno({ rodzaj: 'cena', wiersz: w });
    }
  };

  const nowy = () => {
    setNazwa(''); setIlosc(''); setJednostka('t'); setCena(''); setUwagi(''); setFirma(''); setBlad('');
    setOkno({ rodzaj: 'dodatkowy' });
  };

  const zapisz = () => {
    if (!okno) return;
    const c = parsujLiczbePola(cena);
    if (okno.rodzaj === 'cena') {
      if (c == null || c < 0) { setBlad('Podaj cenę.'); return; }
      onZmien({ cenyMaterialu: { ...raport.cenyMaterialu, [okno.wiersz.klucz]: c } });
      setOkno(null);
      return;
    }
    const il = parsujLiczbePola(ilosc);
    if (!nazwa.trim()) { setBlad('Podaj materiał.'); return; }
    if (!(il && il > 0)) { setBlad('Podaj ilość.'); return; }
    if (c == null || c < 0) { setBlad('Podaj cenę.'); return; }
    const material: MaterialDodatkowy = {
      id: okno.material?.id ?? generujIdRaportu(),
      nazwa: nazwa.trim(),
      ilosc: il,
      jednostka: jednostka.trim() || 'szt.',
      cena: c,
      uwagi: uwagi.trim() || undefined,
      firma: firma.trim() || undefined,
    };
    if (material.firma) void znajdzLubDodajFirme(material.firma);
    onZmien({
      materialyDodatkowe: okno.material
        ? raport.materialyDodatkowe.map((m) => (m.id === material.id ? material : m))
        : [...raport.materialyDodatkowe, material],
    });
    setOkno(null);
  };

  const przywrocCene = () => {
    if (okno?.rodzaj !== 'cena') return;
    const { [okno.wiersz.klucz]: _usun, ...reszta } = raport.cenyMaterialu;
    onZmien({ cenyMaterialu: reszta });
    setOkno(null);
  };

  const usun = () => {
    const m = okno?.rodzaj === 'dodatkowy' ? okno.material : undefined;
    if (!m) return;
    potwierdzAkcje('Usunąć materiał?', m.nazwa, () => {
      onZmien({ materialyDodatkowe: raport.materialyDodatkowe.filter((x) => x.id !== m.id) });
      setOkno(null);
    });
  };

  const suma = sumaKwot(wiersze);

  return (
    <View style={{ gap: ODSTEP.m }}>
      <Sekcja
        tytul="Materiał"
        info="Mieszanki z przerobu z ceną z recepty na dzień raportu. Dotknij wiersza, żeby zmienić cenę tylko w tym raporcie albo poprawić materiał dodatkowy."
      >
        {wiersze.length === 0 ? (
          <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Brak materiału.</Text>
        ) : (
          <Tabela
            kolumny={[
              { tytul: 'Materiał', flex: 2.2 },
              { tytul: 'Ilość', flex: 1.3, prawo: true },
              { tytul: 'Cena', flex: 1.3, prawo: true },
              { tytul: 'Kwota', flex: 1.5, prawo: true },
            ]}
            wiersze={wiersze.map((w) => ({
              klucz: w.klucz,
              etykieta: `Materiał ${w.nazwa}`,
              komorki: [w.nazwa, `${formatLiczby(w.ilosc)} ${w.jednostka}`, `${formatLiczby(w.cena)}${w.zmieniona ? '*' : ''}`, `${formatLiczby(w.kwota)} zł`],
              dopisek: w.dodatkowy
                ? [w.firma, w.uwagi].filter(Boolean).join(' · ') || undefined
                : w.cenaRecepty == null && !w.zmieniona ? 'Brak ceny w recepcie – dotknij, żeby wpisać.' : w.zmieniona ? `Cena z recepty: ${w.cenaRecepty != null ? `${formatLiczby(w.cenaRecepty)} zł/t` : '—'}` : undefined,
            }))}
            suma={['Razem', '', '', `${formatLiczby(suma)} zł`]}
            onWiersz={otworz}
          />
        )}
        <Przycisk tekst="Dodaj materiał" ikona="plus" wariant="drugi" onPress={nowy} />
      </Sekcja>

      <SafeModal
        visible={!!okno}
        tytul={okno?.rodzaj === 'cena' ? 'Cena materiału' : okno?.material ? 'Edytuj materiał' : 'Dodaj materiał'}
        theme={theme}
        onClose={() => setOkno(null)}
        prawy={{ tekst: 'Zapisz', onPress: zapisz, kolor: theme.colors.primary }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={stylFormularza.tresc}>
          {okno?.rodzaj === 'cena' ? (
            <>
              <Text style={[TYPOGRAFIA.tytulKarty, { color: theme.colors.text }]}>{okno.wiersz.nazwa}</Text>
              <Pole etykieta="Cena" jednostka="zł/t" liczba value={cena} onChangeText={setCena} accessibilityLabel="Cena materiału" />
              {okno.wiersz.zmieniona ? (
                <Przycisk
                  tekst={okno.wiersz.cenaRecepty != null ? `Przywróć cenę z recepty (${formatLiczby(okno.wiersz.cenaRecepty)} zł/t)` : 'Usuń cenę z raportu'}
                  wariant="tekst"
                  onPress={przywrocCene}
                />
              ) : null}
            </>
          ) : (
            <>
              <Pole etykieta="Materiał" value={nazwa} onChangeText={setNazwa} placeholder="np. emulsja, kruszywo 0/31,5" accessibilityLabel="Nazwa materiału" />
              <Wiersz proporcje={[1.4, 1]}>
                <Pole etykieta="Ilość" liczba value={ilosc} onChangeText={setIlosc} accessibilityLabel="Ilość materiału" />
                <Pole etykieta="Jednostka" value={jednostka} onChangeText={setJednostka} accessibilityLabel="Jednostka materiału" />
              </Wiersz>
              <Pole etykieta="Cena" jednostka={`zł/${jednostka.trim() || 'j.'}`} liczba value={cena} onChangeText={setCena} accessibilityLabel="Cena materiału" />
              <PoleFirmy value={firma} onChangeText={setFirma} etykieta="Dostawca" />
              <Pole etykieta="Uwagi" value={uwagi} onChangeText={setUwagi} placeholder="Opcjonalnie" accessibilityLabel="Uwagi materiału" />
              {okno?.rodzaj === 'dodatkowy' && okno.material ? <Przycisk tekst="Usuń materiał" wariant="niebezpieczny" ikona="usun" onPress={usun} /> : null}
            </>
          )}
          {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
        </ScrollView>
      </SafeModal>
    </View>
  );
}
