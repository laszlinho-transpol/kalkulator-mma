// ============================================================
// ANIMOWANY PASEK ZAKŁADEK – przesuwający się wskaźnik
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, type ViewStyle } from 'react-native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type AppTheme } from '../../constants/theme';

interface TabItem {
  id: string;
  etykieta: string;
}

interface AnimatedTabBarProps {
  tabs: TabItem[];
  aktywnaId: string;
  onChange: (id: string) => void;
  style?: ViewStyle;
  akcentKolor?: string;
}

export function AnimatedTabBar({ tabs, aktywnaId, onChange, style, akcentKolor }: AnimatedTabBarProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const kolor = akcentKolor ?? theme.colors.primary;

  const aktywnyIdx = tabs.findIndex((t) => t.id === aktywnaId);
  const indicatorX = useRef(new Animated.Value(aktywnyIdx * (100 / tabs.length))).current;
  const wskaznikOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(indicatorX, {
      toValue: aktywnyIdx * (100 / tabs.length),
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [aktywnyIdx, tabs.length]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }, style]}>
      {tabs.map((tab) => {
        const aktywna = tab.id === aktywnaId;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.etykieta,
                { color: aktywna ? kolor : theme.colors.textSecondary },
              ]}
            >
              {tab.etykieta}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Animowany wskaźnik */}
      <Animated.View
        style={[
          styles.wskaznik,
          {
            backgroundColor: kolor,
            width: `${100 / tabs.length}%`,
            left: indicatorX.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
  },
  etykieta: {
    fontSize: 14,
    fontWeight: '600',
  },
  wskaznik: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
  },
});
