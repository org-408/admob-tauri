import { getPlatform } from './bridge.js';
/** Capacitor's PluginListenerHandle */
export interface PluginListenerHandle {
    remove: () => Promise<void>;
}
/** Capacitor's platform names, as far as the plugin looks at them: `ios`, `android`, or `web` for anything else */
export declare const Capacitor: {
    getPlatform: typeof getPlatform;
};
