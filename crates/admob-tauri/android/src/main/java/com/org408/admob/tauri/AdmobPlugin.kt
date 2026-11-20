package com.org408.admob.tauri

import android.app.Activity
import android.content.Context
import android.webkit.WebView
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import com.getcapacitor.community.admob.AdMob

// The Tauri plugin around @capacitor-community/admob's Android plugin (AdMob.java, kept as it is upstream except for the
// Capacitor imports): one command per method of its Capacitor plugin, handed to it as a PluginCall (PluginCall.kt). The
// events Capacitor's `notifyListeners` sent are Tauri's `trigger`, which the page's `addPluginListener` receives.
// `registerListener` and `removeListener` come from Tauri's Plugin class.
@TauriPlugin
class AdmobPlugin(private val activity: Activity) : Plugin(activity), AdMob.Host {
    private var webView: WebView? = null
    private val admob = AdMob(this)

    override fun load(webView: WebView) {
        this.webView = webView
        super.load(webView)
        admob.load()
    }

    override fun onDestroy() {
        admob.handleOnDestroy()
        super.onDestroy()
    }

    override fun getContext(): Context = activity

    override fun getActivity(): Activity = activity

    override fun getWebView(): WebView? = webView

    override fun notifyListeners(eventName: String, data: JSObject) {
        trigger(eventName, app.tauri.plugin.JSObject(data.toString()))
    }

    @Command
    fun initialize(invoke: Invoke) {
        admob.initialize(PluginCall(invoke))
    }

    @Command
    fun trackingAuthorizationStatus(invoke: Invoke) {
        admob.trackingAuthorizationStatus(PluginCall(invoke))
    }

    @Command
    fun requestConsentInfo(invoke: Invoke) {
        admob.requestConsentInfo(PluginCall(invoke))
    }

    @Command
    fun showPrivacyOptionsForm(invoke: Invoke) {
        admob.showPrivacyOptionsForm(PluginCall(invoke))
    }

    @Command
    fun requestTrackingAuthorization(invoke: Invoke) {
        admob.requestTrackingAuthorization(PluginCall(invoke))
    }

    @Command
    fun showConsentForm(invoke: Invoke) {
        admob.showConsentForm(PluginCall(invoke))
    }

    @Command
    fun resetConsentInfo(invoke: Invoke) {
        admob.resetConsentInfo(PluginCall(invoke))
    }

    @Command
    fun setApplicationMuted(invoke: Invoke) {
        admob.setApplicationMuted(PluginCall(invoke))
    }

    @Command
    fun setApplicationVolume(invoke: Invoke) {
        admob.setApplicationVolume(PluginCall(invoke))
    }

    @Command
    fun showBanner(invoke: Invoke) {
        admob.showBanner(PluginCall(invoke))
    }

    @Command
    fun resumeBanner(invoke: Invoke) {
        admob.resumeBanner(PluginCall(invoke))
    }

    @Command
    fun hideBanner(invoke: Invoke) {
        admob.hideBanner(PluginCall(invoke))
    }

    @Command
    fun removeBanner(invoke: Invoke) {
        admob.removeBanner(PluginCall(invoke))
    }

    @Command
    fun startNativeAdFeed(invoke: Invoke) {
        admob.startNativeAdFeed(PluginCall(invoke))
    }

    @Command
    fun destroyNativeAdFeed(invoke: Invoke) {
        admob.destroyNativeAdFeed(PluginCall(invoke))
    }

    @Command
    fun loadNativeAd(invoke: Invoke) {
        admob.loadNativeAd(PluginCall(invoke))
    }

    @Command
    fun updateNativeAdPlacements(invoke: Invoke) {
        admob.updateNativeAdPlacements(PluginCall(invoke))
    }

    @Command
    fun removeNativeAd(invoke: Invoke) {
        admob.removeNativeAd(PluginCall(invoke))
    }

    @Command
    fun captureNativeAdSnapshot(invoke: Invoke) {
        admob.captureNativeAdSnapshot(PluginCall(invoke))
    }

    @Command
    fun prepareNativeAdSnapshot(invoke: Invoke) {
        admob.prepareNativeAdSnapshot(PluginCall(invoke))
    }

    @Command
    fun prepareInterstitial(invoke: Invoke) {
        admob.prepareInterstitial(PluginCall(invoke))
    }

    @Command
    fun showInterstitial(invoke: Invoke) {
        admob.showInterstitial(PluginCall(invoke))
    }

    @Command
    fun prepareRewardVideoAd(invoke: Invoke) {
        admob.prepareRewardVideoAd(PluginCall(invoke))
    }

    @Command
    fun showRewardVideoAd(invoke: Invoke) {
        admob.showRewardVideoAd(PluginCall(invoke))
    }

    @Command
    fun prepareRewardInterstitialAd(invoke: Invoke) {
        admob.prepareRewardInterstitialAd(PluginCall(invoke))
    }

    @Command
    fun showRewardInterstitialAd(invoke: Invoke) {
        admob.showRewardInterstitialAd(PluginCall(invoke))
    }

    @Command
    fun loadAppOpen(invoke: Invoke) {
        admob.loadAppOpen(PluginCall(invoke))
    }

    @Command
    fun showAppOpen(invoke: Invoke) {
        admob.showAppOpen(PluginCall(invoke))
    }

    @Command
    fun isAppOpenLoaded(invoke: Invoke) {
        admob.isAppOpenLoaded(PluginCall(invoke))
    }
}
