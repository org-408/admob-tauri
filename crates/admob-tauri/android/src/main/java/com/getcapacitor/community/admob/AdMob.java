package com.getcapacitor.community.admob;

import android.app.Activity;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import com.org408.admob.tauri.JSArray;
import com.org408.admob.tauri.JSObject;
import com.org408.admob.tauri.PluginCall;
import com.getcapacitor.community.admob.appopen.AppOpenAdPlugin;
import com.getcapacitor.community.admob.banner.BannerExecutor;
import com.getcapacitor.community.admob.consent.AdConsentExecutor;
import com.getcapacitor.community.admob.helpers.AuthorizationStatusEnum;
import com.getcapacitor.community.admob.interstitial.AdInterstitialExecutor;
import com.getcapacitor.community.admob.interstitial.InterstitialAdCallbackAndListeners;
import com.getcapacitor.community.admob.nativeads.NativeAdExecutor;
import com.getcapacitor.community.admob.rewarded.AdRewardExecutor;
import com.getcapacitor.community.admob.rewardedinterstitial.AdRewardInterstitialExecutor;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;
import java.util.Collections;
import org.json.JSONException;

/**
 * @capacitor-community/admob's AdMob plugin (android/.../AdMob.java) without Capacitor's Plugin base: the Tauri plugin
 * (AdmobPlugin.kt) calls it for each command and provides what Capacitor's Plugin did, through {@link Host}.
 */
public class AdMob {

    /** What Capacitor's Plugin class gave this plugin (context, activity, the WebView, events to the page) */
    public interface Host {
        Context getContext();

        Activity getActivity();

        /** The page's WebView (Capacitor: the bridge's) */
        WebView getWebView();

        /** Sends an event to the page's listeners (Capacitor: notifyListeners) */
        void notifyListeners(String eventName, JSObject data);
    }

    private static final String LOG_TAG = "AdMob";

    private final Host host;

    public static final JSArray EMPTY_TESTING_DEVICES = new JSArray();

    private final BannerExecutor bannerExecutor = new BannerExecutor(
        this::getContext,
        this::getActivity,
        this::notifyListeners,
        getLogTag()
    );

    private final AdRewardExecutor adRewardExecutor = new AdRewardExecutor(
        this::getContext,
        this::getActivity,
        this::notifyListeners,
        getLogTag()
    );

    private final AdRewardInterstitialExecutor adRewardInterstitialExecutor = new AdRewardInterstitialExecutor(
        this::getContext,
        this::getActivity,
        this::notifyListeners,
        getLogTag()
    );

    private final AdInterstitialExecutor adInterstitialExecutor = new AdInterstitialExecutor(
        this::getContext,
        this::getActivity,
        this::notifyListeners,
        getLogTag(),
        InterstitialAdCallbackAndListeners.INSTANCE
    );

    private final AdConsentExecutor adConsentExecutor = new AdConsentExecutor(
        this::getContext,
        this::getActivity,
        this::notifyListeners,
        getLogTag()
    );

    private final AppOpenAdPlugin appOpenAdPlugin = new AppOpenAdPlugin();

    private final NativeAdExecutor nativeAdExecutor = new NativeAdExecutor(
        this::getContext,
        this::getActivity,
        () -> getWebView(),
        this::notifyListeners,
        getLogTag()
    );

    private boolean nativeAdPlacementChannelRegistered;

    public AdMob(Host host) {
        this.host = host;
    }

    private Context getContext() {
        return host.getContext();
    }

    private Activity getActivity() {
        return host.getActivity();
    }

    private WebView getWebView() {
        return host.getWebView();
    }

    private void notifyListeners(String eventName, JSObject data) {
        host.notifyListeners(eventName, data);
    }

    private String getLogTag() {
        return LOG_TAG;
    }

    /** Called when the page's WebView exists (Tauri: Plugin.load(webView)) */
    public void load() {
        try {
            io.github.webview_native_ui.engine.NativeUIProjection.install(getWebView());
        } catch (Exception error) {
            android.util.Log.w(getLogTag(), "Native UI channel unavailable; retaining native tracking", error);
        }
        if (androidx.webkit.WebViewFeature.isFeatureSupported(androidx.webkit.WebViewFeature.WEB_MESSAGE_LISTENER)) {
            try {
                androidx.webkit.WebViewCompat.addWebMessageListener(
                    getWebView(),
                    "capacitorAdMobPlacements",
                    Collections.singleton("*"),
                    (view, message, origin, mainFrame, reply) -> {
                        if (mainFrame) nativeAdExecutor.updateDirectPlacements(message.getData());
                    }
                );
                nativeAdPlacementChannelRegistered = true;
            } catch (RuntimeException ignored) {
                // Placement updates retain the regular command as a fallback.
            }
        }
    }

    public void loadAppOpen(final PluginCall call) {
        appOpenAdPlugin.loadAppOpen(getContext(), getActivity(), call, this::notifyListeners);
    }

    public void showAppOpen(final PluginCall call) {
        appOpenAdPlugin.showAppOpen(getActivity(), call, this::notifyListeners);
    }

    public void isAppOpenLoaded(final PluginCall call) {
        appOpenAdPlugin.isAppOpenLoaded(getActivity(), call);
    }

    // ---------------------------------------------------------
    // MAIN METHODS
    // ---------------------------------------------------------

    public void initialize(final PluginCall call) {
        this.setRequestConfiguration(call);

        // Same as banner/interstitial: bridge thread is not the UI thread — MobileAds + view setup must run on main.
        Runnable initOnMain = () -> {
            try {
                MobileAds.initialize(
                    getContext(),
                    new OnInitializationCompleteListener() {
                        @Override
                        public void onInitializationComplete(InitializationStatus initializationStatus) {}
                    }
                );
                // Resolve only once the banner parent actually exists, so a resolved
                // initialize() means what callers already read it as. See #451.
                bannerExecutor.awaitViewGroup((found) -> {
                    if (found) {
                        call.resolve();
                    } else {
                        call.reject("AdMob initialized, but the banner parent view never appeared");
                    }
                });
            } catch (Exception ex) {
                call.reject(ex.getLocalizedMessage(), ex);
            }
        };
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(initOnMain);
        } else {
            new Handler(Looper.getMainLooper()).post(initOnMain);
        }
    }

    public void requestTrackingAuthorization(final PluginCall call) {
        call.resolve();
    }

    public void trackingAuthorizationStatus(final PluginCall call) {
        JSObject response = new JSObject();
        response.put("status", AuthorizationStatusEnum.AUTHORIZED.getStatus());
        call.resolve(response);
    }

    // ---------------------------------------------------------
    // USER CONSENT
    // ---------------------------------------------------------

    public void requestConsentInfo(final PluginCall call) {
        adConsentExecutor.requestConsentInfo(call, this::notifyListeners);
    }

    public void showPrivacyOptionsForm(final PluginCall call) {
        adConsentExecutor.showPrivacyOptionsForm(call, this::notifyListeners);
    }

    public void showConsentForm(final PluginCall call) {
        adConsentExecutor.showConsentForm(call, this::notifyListeners);
    }

    public void resetConsentInfo(final PluginCall call) {
        adConsentExecutor.resetConsentInfo(call, this::notifyListeners);
    }

    // ---------------------------------------------------------
    // APP SETTINGS
    // ---------------------------------------------------------

    public void setApplicationMuted(final PluginCall call) {
        Boolean muted = call.getBoolean("muted");
        if (muted == null) {
            call.reject("muted property cannot be null");
            return;
        }
        MobileAds.setAppMuted(muted);
        call.resolve();
    }

    public void setApplicationVolume(final PluginCall call) {
        Float volume = call.getFloat("volume");
        if (volume == null) {
            call.reject("volume property cannot be null");
            return;
        }
        MobileAds.setAppVolume(volume);
        call.resolve();
    }

    // ---------------------------------------------------------
    // BANNER ADS
    // ---------------------------------------------------------

    public void showBanner(final PluginCall call) {
        // Capacitor's SystemBars plugin pads the page for the keyboard; a Tauri app owns keyboard avoidance itself
        // (what insetsHandling "disable" means in Capacitor)
        bannerExecutor.showBanner(call, false);
    }

    public void hideBanner(final PluginCall call) {
        bannerExecutor.hideBanner(call);
    }

    public void resumeBanner(final PluginCall call) {
        bannerExecutor.resumeBanner(call);
    }

    public void removeBanner(final PluginCall call) {
        bannerExecutor.removeBanner(call);
    }

    // ---------------------------------------------------------
    // NATIVE ADS
    // ---------------------------------------------------------

    public void startNativeAdFeed(final PluginCall call) {
        nativeAdExecutor.startFeed(call);
    }

    public void destroyNativeAdFeed(final PluginCall call) {
        nativeAdExecutor.destroyFeed(call);
    }

    public void loadNativeAd(final PluginCall call) {
        nativeAdExecutor.load(call);
    }

    public void updateNativeAdPlacements(final PluginCall call) {
        nativeAdExecutor.updatePlacements(call);
    }

    public void removeNativeAd(final PluginCall call) {
        nativeAdExecutor.remove(call);
    }

    public void captureNativeAdSnapshot(final PluginCall call) {
        nativeAdExecutor.captureSnapshot(call);
    }

    public void prepareNativeAdSnapshot(final PluginCall call) {
        nativeAdExecutor.prepareSnapshot(call);
    }

    // ---------------------------------------------------------
    // INTERSTITIAL ADS
    // ---------------------------------------------------------

    public void prepareInterstitial(final PluginCall call) {
        adInterstitialExecutor.prepareInterstitial(call, this::notifyListeners);
    }

    public void showInterstitial(final PluginCall call) {
        adInterstitialExecutor.showInterstitial(call, this::notifyListeners);
    }

    // ---------------------------------------------------------
    // REWARDED ADS
    // ---------------------------------------------------------

    public void prepareRewardVideoAd(final PluginCall call) {
        adRewardExecutor.prepareRewardVideoAd(call, this::notifyListeners);
    }

    public void showRewardVideoAd(final PluginCall call) {
        adRewardExecutor.showRewardVideoAd(call, this::notifyListeners);
    }

    public void prepareRewardInterstitialAd(final PluginCall call) {
        adRewardInterstitialExecutor.prepareRewardInterstitialAd(call, this::notifyListeners);
    }

    public void showRewardInterstitialAd(final PluginCall call) {
        adRewardInterstitialExecutor.showRewardInterstitialAd(call, this::notifyListeners);
    }

    // ---------------------------------------------------------
    // REQUEST CONFIGURATION
    // ---------------------------------------------------------

    private void setRequestConfiguration(final PluginCall call) {
        // Testing Devices
        final boolean initializeForTesting = call.getBoolean("initializeForTesting", false);
        final JSArray testingDevices = initializeForTesting
            ? call.getArray("testingDevices", AdMob.EMPTY_TESTING_DEVICES)
            : EMPTY_TESTING_DEVICES;

        // tagForChildDirectedTreatment
        final Boolean tagForChildDirectedTreatment = call.getBoolean("tagForChildDirectedTreatment");
        int TAG_FOR_CHILD_DIRECTED_TREATMENT;

        if (tagForChildDirectedTreatment == null) {
            TAG_FOR_CHILD_DIRECTED_TREATMENT = RequestConfiguration.TAG_FOR_CHILD_DIRECTED_TREATMENT_UNSPECIFIED;
        } else if (tagForChildDirectedTreatment) {
            TAG_FOR_CHILD_DIRECTED_TREATMENT = RequestConfiguration.TAG_FOR_CHILD_DIRECTED_TREATMENT_TRUE;
        } else {
            TAG_FOR_CHILD_DIRECTED_TREATMENT = RequestConfiguration.TAG_FOR_CHILD_DIRECTED_TREATMENT_FALSE;
        }

        // tagForUnderAgeOfConsent
        final Boolean tagForUnderAgeOfConsent = call.getBoolean("tagForUnderAgeOfConsent");
        int TAG_FOR_UNDER_AGE_OF_CONSENT;

        if (tagForUnderAgeOfConsent == null) {
            TAG_FOR_UNDER_AGE_OF_CONSENT = RequestConfiguration.TAG_FOR_UNDER_AGE_OF_CONSENT_UNSPECIFIED;
        } else if (tagForUnderAgeOfConsent) {
            TAG_FOR_UNDER_AGE_OF_CONSENT = RequestConfiguration.TAG_FOR_UNDER_AGE_OF_CONSENT_TRUE;
        } else {
            TAG_FOR_UNDER_AGE_OF_CONSENT = RequestConfiguration.TAG_FOR_UNDER_AGE_OF_CONSENT_FALSE;
        }

        // maxAdContentRating
        final String maxAdContentRating = call.getString("maxAdContentRating");
        String MAX_AD_CONTENT_RATING = RequestConfiguration.MAX_AD_CONTENT_RATING_UNSPECIFIED;

        if (maxAdContentRating != null) {
            switch (maxAdContentRating) {
                case "General":
                    MAX_AD_CONTENT_RATING = RequestConfiguration.MAX_AD_CONTENT_RATING_G;
                    break;
                case "ParentalGuidance":
                    MAX_AD_CONTENT_RATING = RequestConfiguration.MAX_AD_CONTENT_RATING_PG;
                    break;
                case "Teen":
                    MAX_AD_CONTENT_RATING = RequestConfiguration.MAX_AD_CONTENT_RATING_T;
                    break;
                case "MatureAudience":
                    MAX_AD_CONTENT_RATING = RequestConfiguration.MAX_AD_CONTENT_RATING_MA;
                    break;
            }
        }

        try {
            RequestConfiguration requestConfiguration = new RequestConfiguration.Builder()
                .setTestDeviceIds(testingDevices.<String>toList())
                .setTagForChildDirectedTreatment(TAG_FOR_CHILD_DIRECTED_TREATMENT)
                .setTagForUnderAgeOfConsent(TAG_FOR_UNDER_AGE_OF_CONSENT)
                .setMaxAdContentRating(MAX_AD_CONTENT_RATING)
                .build();
            MobileAds.setRequestConfiguration(requestConfiguration);
        } catch (JSONException error) {
            call.reject(error.toString());
        }
    }

    /** Called when the activity is destroyed (Tauri: Plugin.onDestroy) */
    public void handleOnDestroy() {
        if (nativeAdPlacementChannelRegistered) {
            androidx.webkit.WebViewCompat.removeWebMessageListener(getWebView(), "capacitorAdMobPlacements");
            nativeAdPlacementChannelRegistered = false;
        }
        nativeAdExecutor.destroyAll();
    }
}
