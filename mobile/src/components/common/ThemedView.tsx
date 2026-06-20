import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../../constants/theme';

interface ThemedViewProps extends ViewProps {
  variant?: 'background' | 'card' | 'modal' | 'input';
}

export function ThemedView({ style, variant = 'background', ...props }: ThemedViewProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const backgroundColors: Record<string, string> = {
    background: theme.colors.background,
    card: theme.colors.card,
    modal: theme.colors.modalBackground,
    input: theme.colors.inputBackground,
  };

  return (
    <View
      style={[{ backgroundColor: backgroundColors[variant] }, style]}
      {...props}
    />
  );
}
