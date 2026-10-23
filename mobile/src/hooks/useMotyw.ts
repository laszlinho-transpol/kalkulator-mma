import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type AppTheme } from '../constants/theme';

export function useMotyw(): AppTheme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
