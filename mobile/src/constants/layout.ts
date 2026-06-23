// ============================================================
// GLOBALNE STYLE UI – odpowiednik „style.css” dla całej aplikacji
// ============================================================

import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

/** Tekst w ramkach – bez ucinania wyrazów w połowie */
export const tekstWramce: TextStyle = {
  flexShrink: 1,
  flexWrap: 'wrap',
};

/** Tekst w przyciskach nagłówka – zawija się w ramce */
export const tekstPrzyciskNaglowkaWrap: TextStyle = {
  fontSize: 14,
  fontWeight: '600',
  textAlign: 'center',
  flexShrink: 1,
};

/** Nagłówek sekcji / karty */
export const tekstNaglowek: TextStyle = {
  fontSize: 14,
  fontWeight: '800',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

/** Tytuł wiersza listy */
export const tekstTytul: TextStyle = {
  fontSize: 16,
  fontWeight: '700',
};

/** Podtytuł / metadane */
export const tekstPodtytul: TextStyle = {
  fontSize: 13,
  lineHeight: 18,
};

/** Przycisk w nagłówku modala */
export const tekstPrzyciskNaglowka: TextStyle = {
  fontSize: 16,
  fontWeight: '600',
};

/** Tekst przycisku akcji – całe wyrazy, bez łamania */
export const tekstPrzycisk: TextStyle = {
  fontSize: 14,
  fontWeight: '700',
  textAlign: 'center',
};

/** Karta listy */
export const karta: ViewStyle = {
  borderRadius: 14,
  padding: 14,
  borderWidth: 1,
};

/** Nagłówek grupy zwijanej */
export const naglowekGrupy: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: 12,
  borderWidth: 1,
  marginBottom: 6,
};

export const layoutStyles = StyleSheet.create({
  ekran: { flex: 1 },
  lista: { padding: 14, gap: 8 },
  modalTlo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKartaDol: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  modalKartaPelny: { flex: 1 },
  wierszAkcji: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btnEdytuj: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  btnUsun: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});
