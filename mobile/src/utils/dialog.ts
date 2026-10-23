import { Alert, Platform } from 'react-native';

export function pokazKomunikat(tytul: string, tresc: string, onOk?: () => void): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${tytul}\n\n${tresc}`);
    onOk?.();
    return;
  }
  Alert.alert(tytul, tresc, [{ text: 'OK', onPress: onOk }]);
}

/** Potwierdzenie, które działa też w przeglądarce (Alert.alert na webie nie pokazuje przycisków). */
export function potwierdzAkcje(
  tytul: string,
  tresc: string,
  onTak: () => void,
  etykietaTak = 'Usuń',
): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${tytul}\n\n${tresc}`)) onTak();
    return;
  }
  Alert.alert(tytul, tresc, [
    { text: 'Anuluj', style: 'cancel' },
    { text: etykietaTak, style: 'destructive', onPress: onTak },
  ]);
}
