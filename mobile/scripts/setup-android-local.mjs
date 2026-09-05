// Tworzy android/local.properties ze ścieżką SDK (Windows)
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'android');
const localProps = join(androidDir, 'local.properties');

const sdkFromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const defaultWin = join(homedir(), 'AppData', 'Local', 'Android', 'Sdk');
const sdkPath = sdkFromEnv || defaultWin;

if (!existsSync(androidDir)) {
  console.log('Brak folderu android — najpierw uruchom: npm run prebuild:android');
  process.exit(1);
}

const sdkPath = (sdkFromEnv || defaultWin).replace(/\\/g, '/');
const content = `sdk.dir=${sdkPath}\n`;
writeFileSync(localProps, content, 'utf8');
console.log(`✅ Utworzono ${localProps}`);
console.log(`   sdk.dir=${sdkPath}`);
