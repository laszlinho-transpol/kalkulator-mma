import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ACCEPT_XFDF } from '../../utils/xfdfImport';

interface Props {
  etykieta: string;
  kolorTla: string;
  disabled?: boolean;
  onPressNative: () => void;
  onWebFiles: (files: ArrayLike<{ name: string; text: () => Promise<string> }>) => void;
}

/**
 * Na webie prawdziwy &lt;input type="file"&gt; nakrywa przycisk –
 * DocumentPicker + filtr MIME odrzuca .xfdf w przeglądarce.
 */
export function PrzyciskImportuXfdf({ etykieta, kolorTla, disabled, onPressNative, onWebFiles }: Props) {
  const web = Platform.OS === 'web';
  return (
    <View style={styles.wrap} pointerEvents={disabled ? 'none' : 'auto'}>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: kolorTla, opacity: disabled ? 0.5 : 1 }]}
        onPress={web ? undefined : onPressNative}
        disabled={disabled || web}
        activeOpacity={0.85}
      >
        <Text style={styles.btnTekst}>{etykieta}</Text>
      </TouchableOpacity>
      {web
        ? React.createElement('input', {
            type: 'file',
            multiple: true,
            accept: ACCEPT_XFDF,
            disabled,
            onChange: (e: { target: { files: ArrayLike<{ name: string; text: () => Promise<string> }> | null; value: string } }) => {
              const files = e.target.files;
              if (files && files.length > 0) onWebFiles(files);
              e.target.value = '';
            },
            style: webInputStyle as Record<string, string | number>,
            title: etykieta,
          })
        : null}
    </View>
  );
}

const webInputStyle = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  fontSize: 22,
  zIndex: 2,
};

const styles = StyleSheet.create({
  wrap: { position: 'relative', borderRadius: 10 },
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnTekst: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
