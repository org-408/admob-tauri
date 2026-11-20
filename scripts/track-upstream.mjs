// Follows @capacitor-community/admob: its version and the native SDKs it pins.
//
//   node scripts/track-upstream.mjs                  show where we are against the latest upstream release
//   node scripts/track-upstream.mjs --version 8.4.2  ... against that release
//   node scripts/track-upstream.mjs --apply          move our pins to the release (files below), print a summary
//
// What moves (docs/UPSTREAM.md): the devDependency the API-parity test reads, and the pins of the Google Mobile Ads
// SDK and the User Messaging Platform in the Swift package and the Gradle build, which are upstream's. The Swift,
// Kotlin and TypeScript sources are NOT touched: when upstream's API or native code changed, the parity test fails
// on the PR and the port is done by hand.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_JSON = 'package.json';
const PACKAGE_SWIFT = 'crates/admob-tauri/ios/Package.swift';
const BUILD_GRADLE = 'crates/admob-tauri/android/build.gradle.kts';
const NPM_PACKAGE = 'crates/admob-tauri/package.json';

const read = (path) => readFileSync(join(root, path), 'utf8');
const write = (path, text) => writeFileSync(join(root, path), text);

/** Each pin: where upstream states it (file at its tag) and ours (file, pattern with the version as group 2) */
export const PINS = {
  gmaIos: {
    label: 'Google Mobile Ads (iOS)',
    upstream: ['Package.swift', /swift-package-manager-google-mobile-ads\.git", (?:exact: |from: )"([\d.]+)"/],
    ours: [PACKAGE_SWIFT, /(swift-package-manager-google-mobile-ads\.git", exact: ")([\d.]+)(")/],
  },
  umpIos: {
    label: 'User Messaging Platform (iOS)',
    upstream: ['Package.swift', /google-user-messaging-platform\.git", [^"]*"([\d.]+)"/],
    ours: [PACKAGE_SWIFT, /(google-user-messaging-platform\.git", \.upToNextMinor\(from: ")([\d.]+)(")/],
  },
  gmaAndroid: {
    label: 'play-services-ads (Android)',
    upstream: ['android/build.gradle', /playServicesAdsVersion = [^\n]*: '([^']+)'/],
    ours: [BUILD_GRADLE, /(com\.google\.android\.gms:play-services-ads:)([^"]+)(")/],
  },
  umpAndroid: {
    label: 'user-messaging-platform (Android)',
    upstream: ['android/build.gradle', /userMessagingPlatformVersion = [^\n]*: '([^']+)'/],
    ours: [BUILD_GRADLE, /(com\.google\.android\.ump:user-messaging-platform:)([^"]+)(")/],
  },
  engineAndroid: {
    label: 'webview-native-ui engine (Android)',
    upstream: ['android/build.gradle', /io\.github\.webview-native-ui:engine:\$\{[^}]*\?: '([^']+)'\}/],
    ours: [BUILD_GRADLE, /(io\.github\.webview-native-ui:engine:)([^"]+)(")/],
  },
  engineNpm: {
    label: '@webview-native-ui/engine (npm)',
    upstream: ['package.json', /"@webview-native-ui\/engine": "([^"]+)"/],
    ours: [NPM_PACKAGE, /("@webview-native-ui\/engine": ")([^"]+)(")/],
  },
};

async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response;
}

export async function latestUpstream() {
  const meta = await (await get('https://registry.npmjs.org/@capacitor-community/admob/latest')).json();
  return meta.version;
}

/** The versions upstream pins at `version`'s tag */
export async function upstreamPins(version) {
  const files = {};
  const pins = {};
  for (const [key, pin] of Object.entries(PINS)) {
    const [file, pattern] = pin.upstream;
    files[file] ??= await (
      await get(`https://raw.githubusercontent.com/capacitor-community/admob/v${version}/${file}`)
    ).text();
    const found = pattern.exec(files[file]);
    if (!found) throw new Error(`${pin.label}: not found in upstream ${file} at v${version}`);
    pins[key] = found[1];
  }
  return pins;
}

export function ourPins() {
  const pins = {};
  for (const [key, pin] of Object.entries(PINS)) {
    const [file, pattern] = pin.ours;
    const found = pattern.exec(read(file));
    if (!found) throw new Error(`${pin.label}: not found in ${file}`);
    pins[key] = found[2];
  }
  return pins;
}

export const ourUpstreamVersion = () => JSON.parse(read(PACKAGE_JSON)).devDependencies['@capacitor-community/admob'];

/** What differs: [label, ours, upstream] */
export function differences(ours, upstream) {
  return Object.entries(PINS)
    .filter(([key]) => !sameVersion(ours[key], upstream[key]))
    .map(([key, pin]) => [pin.label, ours[key], upstream[key]]);
}

// Gradle's "25.4.+" and "25.4.0" name the same line: only a different major.minor counts
const sameVersion = (a, b) => a === b || a.replace(/\.[+\d]+$/, '') === b.replace(/\.[+\d]+$/, '');

function apply(version, pins) {
  const edits = {};
  for (const [key, pin] of Object.entries(PINS)) {
    const [file, pattern] = pin.ours;
    edits[file] ??= read(file);
    // keep Gradle's `.+` form where we had it
    const value =
      /\.\+$/.test(ourPins()[key]) && !/\.\+$/.test(pins[key]) ? pins[key].replace(/\.\d+$/, '.+') : pins[key];
    edits[file] = edits[file].replace(pattern, `$1${value}$3`);
  }
  for (const [file, text] of Object.entries(edits)) write(file, text);
  const manifest = JSON.parse(read(PACKAGE_JSON));
  manifest.devDependencies['@capacitor-community/admob'] = version;
  write(PACKAGE_JSON, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const given = args.includes('--version') ? args[args.indexOf('--version') + 1] : undefined;
  const version = given ?? (await latestUpstream());
  const current = ourUpstreamVersion();
  const pins = await upstreamPins(version);
  const diff = differences(ourPins(), pins);
  console.log(`upstream: ${current} (ours) -> ${version}`);
  for (const [label, ours, theirs] of diff) console.log(`  ${label}: ${ours} -> ${theirs}`);
  if (current === version && diff.length === 0) console.log('up to date');
  if (args.includes('--apply') && (current !== version || diff.length > 0)) apply(version, pins);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
