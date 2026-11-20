import type { PluginListenerHandle } from '../capacitor.js';
import type { NativeAdEvent, NativeAdErrorEvent, NativeAdRevenueEvent } from './native-ad-event.interface.js';
import type { NativeAdCommandIdentity, NativeAdFeedSession, NativeAdLoadOptions } from './native-ad-options.interface.js';
import type { NativeAdPlacementBatch } from './native-ad-placement.interface.js';
import type { NativeAdPluginEvents } from './native-ad-plugin-events.enum.js';
/** Low-level native bridge used by {@link NativeAdFeed}. */
export interface NativeAdDefinitions {
    startNativeAdFeed(options: NativeAdFeedSession): Promise<void>;
    destroyNativeAdFeed(options: NativeAdFeedSession): Promise<void>;
    loadNativeAd(options: NativeAdLoadOptions): Promise<void>;
    updateNativeAdPlacements(options: NativeAdPlacementBatch): Promise<void>;
    removeNativeAd(options: NativeAdCommandIdentity): Promise<void>;
    /** Android-only snapshot; does not change native visibility. */
    captureNativeAdSnapshot?(options: NativeAdCommandIdentity): Promise<{
        dataUrl: string;
    }>;
    /** Android-only: confirm that the appended image is ready for the next WebView draw. */
    prepareNativeAdSnapshot?(options: NativeAdCommandIdentity): Promise<void>;
    addListener(eventName: NativeAdPluginEvents, listenerFunc: (info: (NativeAdEvent | NativeAdErrorEvent | NativeAdRevenueEvent) & NativeAdFeedSession) => void): Promise<PluginListenerHandle>;
}
