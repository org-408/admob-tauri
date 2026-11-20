// `tauri android init` generates src-tauri/gen/android (not committed). AdMob needs its app ID in the manifest; this
// adds Google's public test app ID. Run it once after `tauri android init`.
import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../src-tauri/gen/android/app/src/main/AndroidManifest.xml', import.meta.url);
const manifest = readFileSync(path, 'utf8');
if (manifest.includes('com.google.android.gms.ads.APPLICATION_ID')) {
  console.log('already patched');
} else {
  const meta = `    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="ca-app-pub-3940256099942544~3347511713" />
`;
  writeFileSync(path, manifest.replace(/(<application[^>]*>\s*\n)/, `$1${meta}`));
  console.log('patched');
}
