// Naprawa: Gradle 9 + foojay-resolver-convention 0.5.0 (błąd IBM_SEMERU na Windows)
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'node_modules/@react-native/gradle-plugin/settings.gradle.kts');

if (!existsSync(path)) {
  console.log('Pominięto fix-gradle-foojay: brak @react-native/gradle-plugin (uruchom npm install).');
  process.exit(0);
}

let content = readFileSync(path, 'utf8');
const before = content;
content = content.replace(
  /foojay-resolver-convention"\)\.version\("0\.5\.0"\)/g,
  'foojay-resolver-convention").version("1.0.0")',
);

if (content === before) {
  console.log('fix-gradle-foojay: już poprawione lub inna wersja foojay.');
} else {
  writeFileSync(path, content);
  console.log('✅ fix-gradle-foojay: foojay-resolver-convention → 1.0.0 (Gradle 9)');
}
