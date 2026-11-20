import type { PluginListenerHandle } from '../capacitor.js';

import type { ValidateAllEventsEnumAreImplemented } from '../private/validate-all-events-implemented.type.js';
import type { AdLoadInfo, AdMobError, AdMobRevenueData, AdShowOptions } from '../shared/index.js';

import type { AppOpenAdOptions } from './app-open-ad-options.interface.js';
import type { AppOpenAdPluginEvents } from './app-open-ad-plugin-events.enum.js';

export type AppOpenDefinitionsHasAllEvents = ValidateAllEventsEnumAreImplemented<
  AppOpenAdPluginEvents,
  AppOpenAdPlugin
>;

export interface AppOpenAdPlugin {
  /**
   * Loads an App Open ad and returns the loaded ad unit ID.
   */
  loadAppOpen(options: AppOpenAdOptions): Promise<AdLoadInfo>;

  /**
   * Shows a loaded App Open ad.
   *
   * @param options Optional. Pass { adId } to show a specific prepared ad instead of the most recent one.
   */
  showAppOpen(options?: AdShowOptions): Promise<void>;

  /**
   * Checks whether an App Open ad is loaded.
   *
   * @param options Optional. Pass an adId to check a specific prepared ad instead of the most recent one.
   */
  isAppOpenLoaded(options?: AdShowOptions): Promise<{ value: boolean }>;

  /**
   * Listens for App Open ad load events.
   */
  addListener(
    eventName: AppOpenAdPluginEvents.Loaded,
    listenerFunc: (info: AdLoadInfo) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Listens for App Open ad load failures.
   */
  addListener(
    eventName: AppOpenAdPluginEvents.FailedToLoad,
    listenerFunc: (error: AdMobError) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Listens for App Open ad opened events.
   */
  addListener(eventName: AppOpenAdPluginEvents.Opened, listenerFunc: () => void): Promise<PluginListenerHandle>;

  /**
   * Listens for App Open ad closed events.
   */
  addListener(eventName: AppOpenAdPluginEvents.Closed, listenerFunc: () => void): Promise<PluginListenerHandle>;

  /**
   * Listens for App Open ad show failures.
   */
  addListener(
    eventName: AppOpenAdPluginEvents.FailedToShow,
    listenerFunc: (error: AdMobError) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Listens for App Open impression-level ad revenue events.
   */
  addListener(
    eventName: AppOpenAdPluginEvents.AdImpression,
    listenerFunc: (data: AdMobRevenueData) => void,
  ): Promise<PluginListenerHandle>;
}
