// Calls every part of admob-tauri with Google's public test ad units. Buttons run one call each; "Run checks" runs
// the ones that need no tap and writes report.json (the Rust `save_report` command).
import { invoke } from '@tauri-apps/api/core';
import {
  AdMob,
  AdmobConsentDebugGeography,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from 'admob-tauri';
import type { PluginListenerHandle } from 'admob-tauri';

// Google's public test units (https://developers.google.com/admob/android/test-ads), never a real account's
const TEST = {
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    reward: 'ca-app-pub-3940256099942544/1712485313',
    appOpen: 'ca-app-pub-3940256099942544/5575463023',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    reward: 'ca-app-pub-3940256099942544/5224354917',
    appOpen: 'ca-app-pub-3940256099942544/9257395921',
  },
};
const isIOS = (globalThis as { __ADMOB_TAURI__?: { platform?: string } }).__ADMOB_TAURI__?.platform === 'ios';
const ids = isIOS ? TEST.ios : TEST.android;

const $ = (id: string) => document.getElementById(id)!;
const log = (line: string) => ($('log').textContent += `${line}\n`);

/** The events seen, by name (and the last SizeChanged) */
const seen: Record<string, number> = {};
let bannerHeight = -1;
const handles: PluginListenerHandle[] = [];
async function listen() {
  const names = [
    ...Object.values(BannerAdPluginEvents),
    ...Object.values(InterstitialAdPluginEvents),
    ...Object.values(RewardAdPluginEvents),
  ] as string[];
  for (const name of names) {
    handles.push(
      await (AdMob as any).addListener(name, (info: any) => {
        seen[name] = (seen[name] ?? 0) + 1;
        if (name === BannerAdPluginEvents.SizeChanged) bannerHeight = info.height;
        $('events').textContent = Object.entries(seen)
          .map(([n, c]) => `${n} ×${c}`)
          .join('\n');
        log(`event ${name} ${JSON.stringify(info ?? {})}`);
      }),
    );
  }
}

type Step = [string, () => Promise<unknown>];
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (done: () => boolean, ms = 20000) => {
  for (let t = 0; t < ms && !done(); t += 200) await pause(200);
  if (!done()) throw new Error('timed out');
};

const steps: Step[] = [
  ['initialize', () => AdMob.initialize({ initializeForTesting: true })],
  ['trackingAuthorizationStatus', () => AdMob.trackingAuthorizationStatus()],
  ['requestConsentInfo', () => AdMob.requestConsentInfo({ debugGeography: AdmobConsentDebugGeography.DISABLED })],
  [
    'showBanner + SizeChanged',
    async () => {
      bannerHeight = -1;
      await AdMob.showBanner({
        adId: ids.banner,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: true,
      });
      await until(() => bannerHeight > 0);
      return { height: bannerHeight };
    },
  ],
  ['hideBanner', () => AdMob.hideBanner()],
  ['resumeBanner', () => AdMob.resumeBanner()],
  ['removeBanner', () => AdMob.removeBanner()],
  ['prepareInterstitial', () => AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: true })],
  ['prepareRewardVideoAd', () => AdMob.prepareRewardVideoAd({ adId: ids.reward, isTesting: true })],
  ['prepareRewardInterstitialAd', () => AdMob.prepareRewardInterstitialAd({ adId: ids.reward, isTesting: true })],
  ['loadAppOpen', () => AdMob.loadAppOpen({ adId: ids.appOpen })],
  ['isAppOpenLoaded', () => AdMob.isAppOpenLoaded({ adId: ids.appOpen })],
  ['setApplicationMuted', () => AdMob.setApplicationMuted({ muted: false })],
  ['setApplicationVolume', () => AdMob.setApplicationVolume({ volume: 1.0 })],
];

const results: { step: string; ok: boolean; detail: string }[] = [];
async function run(name: string, fn: () => Promise<unknown>) {
  try {
    const value = await fn();
    const detail = JSON.stringify(value ?? null);
    results.push({ step: name, ok: true, detail });
    log(`✓ ${name} ${detail}`);
  } catch (error) {
    const e = error as { message?: string; code?: string };
    const detail = `${e.code ?? ''} ${e.message ?? String(error)}`.trim();
    results.push({ step: name, ok: false, detail });
    log(`✗ ${name} ${detail}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  const last = results[results.length - 1]!;
  $('summary').textContent =
    `${results.length - failed} ok, ${failed} failed. Last: ${last.step} ${last.detail.slice(0, 90)}`;
  $('summary').className = failed ? 'fail' : 'ok';
}

async function runChecks() {
  results.length = 0;
  for (const [name, fn] of steps) await run(name, fn);
  await invoke('save_report', { report: JSON.stringify({ events: seen, results }, null, 2) });
}

const buttons: [string, () => Promise<unknown>][] = [
  ['Run checks', async () => runChecks()],
  ['Consent form', () => AdMob.showConsentForm()],
  ['Privacy options', () => AdMob.showPrivacyOptionsForm()],
  ['Reset consent', () => AdMob.resetConsentInfo()],
  ['Request ATT', () => AdMob.requestTrackingAuthorization()],
  ...steps.filter(([n]) => /Banner|removeBanner/.test(n)).map(([n, f]) => [n, f] as [string, () => Promise<unknown>]),
  ['Show interstitial', () => AdMob.showInterstitial()],
  ['Show reward video', () => AdMob.showRewardVideoAd()],
  ['Show reward interstitial', () => AdMob.showRewardInterstitialAd()],
  ['Show app open', () => AdMob.showAppOpen()],
];
for (const [label, fn] of buttons) {
  const button = document.createElement('button');
  button.textContent = label;
  button.onclick = () => (label === 'Run checks' ? runChecks() : run(label, fn));
  $('buttons').append(button);
}

listen().then(() => {
  if (location.hash === '#auto' || import.meta.env.VITE_AUTORUN) void runChecks();
});
