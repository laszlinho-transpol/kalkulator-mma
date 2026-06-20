// ============================================================
// MOTYW – Dark / Light Mode
// ============================================================

export const lightTheme = {
  dark: false,
  colors: {
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    primary: '#E8A020',
    primaryDark: '#C4860F',
    secondary: '#2E86AB',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    tileBackground: '#FFFFFF',
    tileShadow: '#00000015',
    inputBackground: '#F9FAFB',
    modalBackground: '#FFFFFF',
    tabBar: '#FFFFFF',
    tabBarInactive: '#9CA3AF',
    statusBar: 'dark' as const,
  },
} as const;

export const darkTheme = {
  dark: true,
  colors: {
    background: '#0F0F1A',
    card: '#1E1E2E',
    text: '#F0F0F0',
    textSecondary: '#9CA3AF',
    border: '#374151',
    primary: '#E8A020',
    primaryDark: '#C4860F',
    secondary: '#2E86AB',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    tileBackground: '#1E1E2E',
    tileShadow: '#00000040',
    inputBackground: '#252535',
    modalBackground: '#252535',
    tabBar: '#1E1E2E',
    tabBarInactive: '#6B7280',
    statusBar: 'light' as const,
  },
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;
