import React from 'react';
import { Text, type TextProps, StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../../constants/theme';

interface ThemedTextProps extends TextProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

export function ThemedText({
  style,
  variant = 'primary',
  size = 'md',
  weight = 'normal',
  ...props
}: ThemedTextProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const colors: Record<string, string> = {
    primary: theme.colors.text,
    secondary: theme.colors.textSecondary,
    accent: theme.colors.primary,
    danger: theme.colors.danger,
    success: theme.colors.success,
  };

  const sizes: Record<string, number> = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
  };

  const weights: Record<string, '400' | '500' | '600' | '700'> = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };

  return (
    <Text
      style={[
        {
          color: colors[variant],
          fontSize: sizes[size],
          fontWeight: weights[weight],
        },
        style,
      ]}
      {...props}
    />
  );
}
