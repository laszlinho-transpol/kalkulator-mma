// Lista stron ze schowanym okienkiem „Zasada działania”.

export function odczytajUkryte(json: string | null): string[] {
  if (!json) return [];
  try {
    const lista = JSON.parse(json);
    return Array.isArray(lista) ? [...new Set(lista.filter((k): k is string => typeof k === 'string'))] : [];
  } catch {
    return [];
  }
}

export function przelaczUkryta(ukryte: string[], klucz: string): string[] {
  return ukryte.includes(klucz) ? ukryte.filter((k) => k !== klucz) : [...ukryte, klucz];
}
