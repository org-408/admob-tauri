// @capacitor-community/admob: src/index.ts
//
// Capacitor's registerPlugin becomes the plugin's Tauri commands, and its listeners (`addListener`) Tauri's plugin
// listeners: the Swift and Kotlin plugins `trigger` an event where Capacitor's call `notifyListeners`. Off iOS and
// Android (a PC's webview, a plain browser) the web stand-in of @capacitor-community/admob (web.ts) answers.
import { addPluginListener } from '@tauri-apps/api/core';

import type { AdMobPlugin } from './definitions.js';
import { getPlatform, invokeCommand } from './bridge.js';
import { COMMANDS } from './commands.js';
import type { PluginListenerHandle } from './capacitor.js';
import type { NativeAdDefinitions } from './native-ads/native-ad-definitions.interface.js';
import { configureNativeAdBridge } from './native-ads/native-ad-feed.js';
import { AdMobWeb } from './web.js';

const PLUGIN = 'admob-tauri';

type Methods = Record<string, (...args: unknown[]) => unknown>;

function createNativePlugin(): AdMobPlugin & NativeAdDefinitions {
  const plugin: Methods = {};
  for (const [method, command] of Object.entries(COMMANDS)) {
    plugin[method] = async (options?: unknown) => {
      const result = await invokeCommand(PLUGIN, command, options);
      return result === null ? undefined : result;
    };
  }
  const listeners = new Set<PluginListenerHandle>();
  plugin.addListener = async (eventName: unknown, listener: unknown) => {
    const registered = await addPluginListener(PLUGIN, eventName as string, listener as (payload: unknown) => void);
    const handle: PluginListenerHandle = {
      remove: async () => {
        listeners.delete(handle);
        await registered.unregister();
      },
    };
    listeners.add(handle);
    return handle;
  };
  plugin.removeAllListeners = async () => {
    await Promise.all([...listeners].map((handle) => handle.remove()));
  };
  return plugin as unknown as AdMobPlugin & NativeAdDefinitions;
}

let native: (AdMobPlugin & NativeAdDefinitions) | undefined;
let web: (AdMobPlugin & NativeAdDefinitions) | undefined;

/** The native plugin on iOS and Android, the web stand-in anywhere else, as Capacitor's `registerPlugin` picks */
function implementation(): AdMobPlugin & NativeAdDefinitions {
  if (getPlatform() !== 'web') {
    return (native ??= createNativePlugin());
  }
  return (web ??= new AdMobWeb() as AdMobPlugin & NativeAdDefinitions);
}

/** Each call goes to the implementation picked when it is made (the platform is known by then) */
const nativeAdBridge = new Proxy({} as AdMobPlugin & NativeAdDefinitions, {
  get(_target, property) {
    const target = implementation() as unknown as Record<string | symbol, unknown>;
    const value = target[property];
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
const AdMob: AdMobPlugin = nativeAdBridge;

configureNativeAdBridge(nativeAdBridge);

export * from './definitions.js';
export * from './banner/index.js';
export * from './interstitial/index.js';
export * from './reward-interstitial/index.js';
export * from './reward/index.js';
export * from './consent/index.js';
export * from './shared/index.js';
export * from './app-open/index.js';
export * from './native-ads/index.js';
export type { PluginListenerHandle } from './capacitor.js';
export { AdMob };
