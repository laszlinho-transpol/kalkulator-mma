#!/usr/bin/env node
// ============================================================
// WERYFIKACJA PRZED WYDANIEM – npm run verify
// Uruchamia: TypeScript, testy obliczeń, expo-doctor
// ============================================================

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, label) {
  console.log(`\n▶ ${label}...`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`\n❌ BŁĄD: ${label}`);
    process.exit(1);
  }
  console.log(`✅ ${label}`);
}

console.log('═══════════════════════════════════════');
console.log('  KALKULATOR MMA – weryfikacja wydania');
console.log('═══════════════════════════════════════');

run('npx', ['tsc', '--noEmit'], 'Sprawdzanie TypeScript');
run('npx', ['tsx', '--test', 'src/utils/calculations.test.ts'], 'Testy obliczeń');
run('npx', ['expo-doctor'], 'Expo Doctor');

console.log('\n═══════════════════════════════════════');
console.log('  ✅ Wszystkie testy przeszły pomyślnie');
console.log('  Można budować: eas build --profile production');
console.log('═══════════════════════════════════════\n');
