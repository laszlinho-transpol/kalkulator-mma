import React, { useCallback, useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ACCEPT_XFDF } from '../../utils/xfdfImport';

type PlikWeb = { name: string; text: () => Promise<string> };

interface Props {
  etykieta: string;
  kolorTla: string;
  disabled?: boolean;
  onPressNative: () => void;
  onWebFiles: (files: PlikWeb[]) => void;
}

function zrzutPlikow(lista: ArrayLike<PlikWeb> | null | undefined): PlikWeb[] {
  if (!lista || lista.length === 0) return [];
  const out: PlikWeb[] = [];
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i];
    if (f) out.push(f);
  }
  return out;
}

/**
 * Na webie prawdziwy input file. FileList kopiujemy zanim wyczyścimy value
 * (inaczej zostaje tylko pierwszy plik).
 */
export function PrzyciskImportuXfdf({ etykieta, kolorTla, disabled, onPressNative, onWebFiles }: Props) {
  const web = Platform.OS === 'web';
  const onWebFilesRef = useRef(onWebFiles);
  onWebFilesRef.current = onWebFiles;

  const podlaczInput = useCallback((node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const el = node as { multiple?: boolean; setAttribute?: (n: string, v: string) => void };
    el.multiple = true;
    el.setAttribute?.('multiple', 'multiple');
  }, []);

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
            ref: podlaczInput,
            onChange: (e: { target: { files: ArrayLike<PlikWeb> | null; value: string } }) => {
              const files = zrzutPlikow(e.target.files);
              e.target.value = '';
              if (files.length > 0) onWebFilesRef.current(files);
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
