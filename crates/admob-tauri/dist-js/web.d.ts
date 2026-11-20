import { WebPlugin } from './web-plugin.js';
import type { AdMobPlugin, ApplicationMutedOptions, ApplicationVolumeOptions, AdmobConsentInfo, AdmobConsentRequestOptions } from './index.js';
import type { AppOpenAdOptions } from './app-open/app-open-ad-options.interface.js';
import type { NativeAdDefinitions } from './native-ads/native-ad-definitions.interface.js';
import type { NativeAdCommandIdentity, NativeAdFeedSession } from './native-ads/native-ad-options.interface.js';
import type { NativeAdPlacementBatch } from './native-ads/native-ad-placement.interface.js';
import type { AdMobRewardItem } from './reward/index.js';
import type { AdOptions, AdLoadInfo, AdShowOptions } from './shared/index.js';
import type { TrackingAuthorizationStatusInterface } from './shared/tracking-authorization-status.interface.js';
export declare class AdMobWeb extends WebPlugin implements AdMobPlugin, NativeAdDefinitions {
    initialize(): Promise<void>;
    requestTrackingAuthorization(): Promise<void>;
    trackingAuthorizationStatus(): Promise<TrackingAuthorizationStatusInterface>;
    requestConsentInfo(options?: AdmobConsentRequestOptions): Promise<AdmobConsentInfo>;
    showPrivacyOptionsForm(): Promise<void>;
    showConsentForm(): Promise<AdmobConsentInfo>;
    resetConsentInfo(): Promise<void>;
    setApplicationMuted(options: ApplicationMutedOptions): Promise<void>;
    setApplicationVolume(options: ApplicationVolumeOptions): Promise<void>;
    showBanner(options: AdOptions): Promise<void>;
    hideBanner(): Promise<void>;
    resumeBanner(): Promise<void>;
    removeBanner(): Promise<void>;
    startNativeAdFeed(): Promise<void>;
    destroyNativeAdFeed(options: NativeAdFeedSession): Promise<void>;
    loadNativeAd(): Promise<void>;
    updateNativeAdPlacements(options: NativeAdPlacementBatch): Promise<void>;
    removeNativeAd(options: NativeAdCommandIdentity): Promise<void>;
    prepareInterstitial(options: AdOptions): Promise<AdLoadInfo>;
    showInterstitial(options?: AdShowOptions): Promise<void>;
    prepareRewardVideoAd(options: AdOptions): Promise<AdLoadInfo>;
    showRewardVideoAd(options?: AdShowOptions): Promise<AdMobRewardItem>;
    prepareRewardInterstitialAd(options: AdOptions): Promise<AdLoadInfo>;
    showRewardInterstitialAd(options?: AdShowOptions): Promise<AdMobRewardItem>;
    loadAppOpen(options: AppOpenAdOptions): Promise<AdLoadInfo>;
    showAppOpen(options?: AdShowOptions): Promise<void>;
    isAppOpenLoaded(): Promise<{
        value: boolean;
    }>;
    addListener(eventName: string, listenerFunc: (...args: any[]) => void): Promise<{
        remove: () => Promise<void>;
    }>;
}
