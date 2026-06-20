// ============================================================
// KONTEKST MOTYWU – auto / ciemny / jasny z zapisem w ustawieniach
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type AppTheme } from '../constants/theme';
import { pobierzUstawienia, zapiszUstawienia, type MotywPreferencja } from '../utils/settings';

interface ThemeContextValue {
  theme: AppTheme;
  preferencja: MotywPreferencja;
  ustawPreferencje: (m: MotywPreferencja) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  preferencja: 'auto',
  ustawPreferencje: async () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preferencja, setPreferencja] = useState<MotywPreferencja>('dark');

  useEffect(() => {
    pobierzUstawienia().then((u) => {
      setPreferencja(u.motyw);
    });
  }, []);

  const effectiveScheme = preferencja === 'auto'
    ? (systemScheme ?? 'dark')
    : preferencja;

  const theme = effectiveScheme === 'dark' ? darkTheme : lightTheme;
  const isDark = effectiveScheme === 'dark';

  const ustawPreferencje = useCallback(async (m: MotywPreferencja) => {
    setPreferencja(m);
    const u = await pobierzUstawienia();
    await zapiszUstawienia({ ...u, motyw: m });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, preferencja, ustawPreferencje, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
