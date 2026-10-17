/** Numer do schowka i wybierania: same cyfry, „+” tylko na początku. */
export function oczyscNumer(numer: string): string {
  return numer.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
}
