// The little of @capacitor/core that @capacitor-community/admob's TypeScript uses, on Tauri: the listener handle
// and the platform. Everything else of Capacitor (registerPlugin, WebPlugin) is in index.ts and web-plugin.ts.
import { getPlatform } from './bridge.js';

/** Capacitor's PluginListenerHandle */
export interface PluginListenerHandle {
  remove: () => Promise<void>;
}

/** Capacitor's platform names, as far as the plugin looks at them: `ios`, `android`, or `web` for anything else */
export const Capacitor = {
  getPlatform,
};
