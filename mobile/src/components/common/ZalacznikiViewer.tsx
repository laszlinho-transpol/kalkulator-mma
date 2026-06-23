// ============================================================
// PODGLĄD ZAŁĄCZNIKÓW – zakładki, pinch-zoom (WebView)
// ============================================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeModal } from './SafeModal';
import type { AppTheme } from '../../constants/theme';
import type { ZalacznikPlanu } from '../../types';

const { width: SW } = Dimensions.get('window');

interface ZalacznikiViewerProps {
  visible: boolean;
  zalaczniki: ZalacznikPlanu[];
  theme: AppTheme;
  onClose: () => void;
}

export function ZalacznikiViewer({ visible, zalaczniki, theme, onClose }: ZalacznikiViewerProps) {
  const [idx, setIdx] = useState(0);
  const aktualny = zalaczniki[idx];

  if (!aktualny) return null;

  const uriHtml = aktualny.typ === 'pdf'
    ? `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes"/></head>
       <body style="margin:0;background:#111"><embed src="${aktualny.uri}" type="application/pdf" width="100%" height="100%" style="min-height:100vh"/></body></html>`
    : `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes"/>
       <style>body{margin:0;display:flex;align-items:center;justify-content:center;background:#111;min-height:100vh}
       img{max-width:100%;height:auto;transform-origin:center}</style></head>
       <body><img src="${aktualny.uri}" /></body></html>`;

  return (
    <SafeModal visible={visible} tytul="Załączniki planu" theme={theme} onClose={onClose} presentation="fullScreen">
      {zalaczniki.length > 1 && (
        <View style={[styles.tabs, { borderBottomColor: theme.colors.border }]}>
          {zalaczniki.map((z, i) => (
            <TouchableOpacity
              key={z.id}
              style={[styles.tab, idx === i && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setIdx(i)}
            >
              <Text style={{ color: idx === i ? theme.colors.primary : theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                {z.nazwa}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={[styles.podpowiedz, { color: theme.colors.textSecondary }]}>
        Szczypnij palcami aby przybliżyć / oddalić • obróć telefon dla lepszego widoku
      </Text>
      <WebView
        source={{ html: uriHtml }}
        style={{ flex: 1, backgroundColor: '#111' }}
        originWhitelist={['*']}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        scalesPageToFit
        setBuiltInZoomControls
        setDisplayZoomControls
      />
    </SafeModal>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 1, maxHeight: 44 },
  tab: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
  podpowiedz: { fontSize: 11, textAlign: 'center', paddingVertical: 6, paddingHorizontal: 12 },
});
