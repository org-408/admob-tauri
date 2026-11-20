import type { AdMobError, AdMobRevenueData } from '../shared/index.js';

import type { NativeAdIdentity } from './native-ad-options.interface.js';

export type NativeAdErrorEvent = NativeAdIdentity & AdMobError;
export type NativeAdRevenueEvent = NativeAdIdentity & AdMobRevenueData;
export type NativeAdEvent = NativeAdIdentity;
