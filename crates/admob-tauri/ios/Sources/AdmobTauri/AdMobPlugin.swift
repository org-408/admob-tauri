import Foundation
import Tauri
import WebKit
import GoogleMobileAds
#if canImport(AppTrackingTransparency)
import AppTrackingTransparency
#endif

// @capacitor-community/admob: ios/Sources/AdMobPlugin/AdMobPlugin.swift
//
// The same plugin on Tauri: Capacitor's call is Tauri's `Invoke` wrapped in `PluginCall` (PluginCall.swift), and
// `notifyListeners` is Tauri's `trigger` (the page listens with `addPluginListener`). Everything else is upstream's.
@objc(AdMobPlugin)
public class AdMobPlugin: Plugin {
    /// The page's web view (Capacitor: `bridge.webView`)
    weak var webView: WKWebView?

    /// Capacitor's `notifyListeners`: an event for the page's listeners
    func notifyListeners(_ eventName: String, data: [String: Any]) {
        trigger(eventName, data: AdMobPlugin.jsObject(data))
    }

    /// An event's data as the values Tauri's `trigger` takes (the plugin builds it with `CGFloat`, `Int64` and the like)
    static func jsObject(_ data: [String: Any]) -> JSObject {
        return data.mapValues { jsValue($0) }
    }

    private static func jsValue(_ value: Any) -> JSValue {
        switch value {
        case let value as Bool: return value
        case let value as Int: return value
        case let value as Int64: return Int(value)
        case let value as Int32: return Int(value)
        case let value as UInt: return Int(value)
        case let value as Double: return value
        case let value as Float: return Double(value)
        case let value as CGFloat: return Double(value)
        case let value as String: return value
        case let value as NSNumber: return value
        case let value as [String: Any]: return jsObject(value)
        case let value as [Any]: return value.map { jsValue($0) }
        default: return NSNull()
        }
    }

    private let appOpenAdPlugin = AppOpenAdPlugin()

    @objc public func loadAppOpen(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        appOpenAdPlugin.loadAppOpen(
            call,
            notify: { [weak self] eventName, data in
                self?.notifyListeners(eventName, data: data)
            }
        )
    }

    @objc public func showAppOpen(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        appOpenAdPlugin.showAppOpen(
            call,
            getRootViewController: self.getRootVC,
            notify: { [weak self] eventName, data in
                self?.notifyListeners(eventName, data: data)
            }
        )
    }

    @objc public func isAppOpenLoaded(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        appOpenAdPlugin.isAppOpenLoaded(call)
    }

    var testingDevices: [String] = []

    private let bannerExecutor = BannerExecutor()
    private let adInterstitialExecutor = AdInterstitialExecutor()
    private let adRewardExecutor = AdRewardExecutor()
    private let adRewardInterstitialExecutor = AdRewardInterstitialExecutor()
    private let consentExecutor = ConsentExecutor()
    private let nativeAdExecutor = NativeAdExecutor()

    public override func load(webview: WKWebView) {
        self.webView = webview
        self.consentExecutor.plugin = self
    }

    /// Full-screen ads that currently have web media suspended.
    private var webMediaSuspenders = Set<ObjectIdentifier>()

    /// Pauses all web media while a full-screen ad is up, so WebKit releases its audio before the ad plays
    /// and sets it up again afterwards, instead of leaving web audio silent until the app restarts.
    func suspendWebMedia(for owner: AnyObject) {
        Task { @MainActor [weak self] in
            guard let self, self.webMediaSuspenders.insert(ObjectIdentifier(owner)).inserted,
                self.webMediaSuspenders.count == 1
            else { return }
            self.setWebMediaPlaybackSuspended(true)
        }
    }

    /// Only resumes once every ad that suspended has resumed, so a failed present (which can arrive
    /// without a preceding adWillPresentFullScreenContent) can't release another ad's suspension.
    func resumeWebMedia(for owner: AnyObject) {
        Task { @MainActor [weak self] in
            guard let self, self.webMediaSuspenders.remove(ObjectIdentifier(owner)) != nil,
                self.webMediaSuspenders.isEmpty
            else { return }
            self.setWebMediaPlaybackSuspended(false)
        }
    }

    @MainActor
    func setWebMediaPlaybackSuspended(_ suspended: Bool) {
        self.webView?.setAllMediaPlaybackSuspended(suspended, completionHandler: nil)
    }

    /**
     * DEPRECATED: It's now ship with Admob UMP Consent
     */
    @objc public func requestTrackingAuthorization(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        if #available(iOS 14, *) {
            #if canImport(AppTrackingTransparency)
            ATTrackingManager.requestTrackingAuthorization(completionHandler: { _ in
                call.resolve([:])
            })
            #else
            call.resolve([:])
            #endif
        } else {
            call.resolve([:])
        }
    }

    @objc public func setApplicationMuted(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        if let shouldMute = call.getBool("muted") {
            MobileAds.shared.isApplicationMuted = shouldMute
            call.resolve([:])
        } else {
            call.reject("muted property cannot be null")
            return
        }
    }

    @objc public func setApplicationVolume(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        if var volume = call.getFloat("volume") {
            // Clamp volumes.
            if volume < 0.0 {volume = 0.0} else if volume > 1.0 {volume = 1.0}

            MobileAds.shared.applicationVolume = volume

            call.resolve([:])
        } else {
            call.reject("volume property cannot be null")
            return
        }
    }

    deinit {
        let executor = nativeAdExecutor
        if Thread.isMainThread {
            executor.destroyAll()
        } else {
            DispatchQueue.main.async { executor.destroyAll() }
        }
    }

    /**
     *  AdMob: Intertitial
     *  https://developers.google.com/admob/ios/interstitial?hl=ja
     */
    @objc public func prepareInterstitial(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let adUnitID = getAdId(call, "ca-app-pub-3940256099942544/1033173712")
        let request = self.GADRequestWithOption(call.getBool("npa") ?? false)

        DispatchQueue.main.async {
            self.adInterstitialExecutor.prepareInterstitial(call, request, adUnitID)
        }
    }

    @objc public func showInterstitial(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async {
            self.adInterstitialExecutor.showInterstitial(call)
        }
    }

    /**
     *  AdMob: Rewarded Ads
     *  https://developers.google.com/ad-manager/mobile-ads-sdk/ios/rewarded-ads
     */
    @objc public func prepareRewardVideoAd(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let adUnitID = getAdId(call, "ca-app-pub-3940256099942544/1712485313")
        let request = self.GADRequestWithOption(call.getBool("npa") ?? false)

        DispatchQueue.main.async {
            self.adRewardExecutor.prepareRewardVideoAd(call, request, adUnitID)
        }
    }

    @objc public func showRewardVideoAd(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async {
            self.adRewardExecutor.showRewardVideoAd(call)
        }
    }

    /**
     *  AdMob: Rewarded Interstitial Ads
     *  https://developers.google.com/ad-manager/mobile-ads-sdk/ios/rewarded-interstitial
     */
    @objc public func prepareRewardInterstitialAd(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let adUnitID = getAdId(call, "ca-app-pub-3940256099942544/6978759866")
        let request = self.GADRequestWithOption(call.getBool("npa") ?? false)

        DispatchQueue.main.async {
            self.adRewardInterstitialExecutor.prepareRewardInterstitialAd(call, request, adUnitID)
        }
    }

    @objc public func showRewardInterstitialAd(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async {
            self.adRewardInterstitialExecutor.showRewardInterstitialAd(call)
        }
    }

    @objc public func trackingAuthorizationStatus(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async {
            if #available(iOS 14, *) {
                switch ATTrackingManager.trackingAuthorizationStatus {
                case .authorized:
                    call.resolve(["status": AuthorizationStatusEnum.Authorized.rawValue])
                case .denied:
                    call.resolve(["status": AuthorizationStatusEnum.Denied.rawValue])
                case .restricted:
                    call.resolve(["status": AuthorizationStatusEnum.Restricted.rawValue])
                case .notDetermined:
                    call.resolve(["status": AuthorizationStatusEnum.NotDetermined.rawValue])
                @unknown default:
                    call.reject("trackingAuthorizationStatus can't get status")
                }
            } else {
                call.resolve(["status": AuthorizationStatusEnum.Authorized])
            }
        }
    }

    /**
     * Admob: User Message Platform
     * https://support.google.com/admob/answer/10113005?hl=en
     */
    @objc public func requestConsentInfo(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let debugGeography = call.getInt("debugGeography", 0)

        let testDeviceJSArray = call.getArray("testDeviceIdentifiers") ?? []
        var testDeviceIdentifiers: [String] = []
        if testDeviceJSArray.count > 0 {
            for deviceId in testDeviceJSArray {
                if let name = deviceId as? String {
                    testDeviceIdentifiers.append(name)
                }
            }
        }

        let tagForUnderAgeOfConsent = call.getBool("tagForUnderAgeOfConsent", false)

        DispatchQueue.main.async {
            self.consentExecutor.requestConsentInfo(call, debugGeography, testDeviceIdentifiers, tagForUnderAgeOfConsent)
        }
    }

    @objc public func showConsentForm(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async {
            self.consentExecutor.showConsentForm(call)
        }
    }

    @objc public func showPrivacyOptionsForm(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async {
            self.consentExecutor.showPrivacyOptionsForm(call)
        }
    }

    @objc public func resetConsentInfo(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async {
            self.consentExecutor.resetConsentInfo(call)
        }
    }

    private func getAdId(_ call: PluginCall, _ testingID: String) -> String {
        let adUnitID = call.getString("adId") ?? testingID
        let isTest = call.getBool("isTesting") ?? false
        if isTest {
            return testingID
        }
        return adUnitID
    }

    private func GADRequestWithOption(_ npa: Bool) -> Request {
        let request = Request()

        if npa {
            let extras = Extras()
            extras.additionalParameters = ["npa": "1"]
            request.register(extras)
        }

        return request
    }

    /**
     * https://developers.google.com/admob/ios/targeting?hl=ja
     */
    private func setRequestConfiguration(_ call: PluginCall) {

        if call.getBool("initializeForTesting") ?? false {
            MobileAds.shared.requestConfiguration.testDeviceIdentifiers = call.getArray("testingDevices", String.self) ?? []
        }

        if call.getBool("tagForChildDirectedTreatment") == true {
            MobileAds.shared.requestConfiguration.tagForChildDirectedTreatment = true
        }

        if call.getBool("tagForUnderAgeOfConsent") == true {
            MobileAds.shared.requestConfiguration.tagForUnderAgeOfConsent = true
        }

        if call.getString("maxAdContentRating") != nil {
            switch call.getString("maxAdContentRating") {
            case "General":
                MobileAds.shared.requestConfiguration.maxAdContentRating =
                    GADMaxAdContentRating.general
            case "ParentalGuidance":
                MobileAds.shared.requestConfiguration.maxAdContentRating =
                    GADMaxAdContentRating.parentalGuidance
            case "Teen":
                MobileAds.shared.requestConfiguration.maxAdContentRating =
                    GADMaxAdContentRating.teen
            case "MatureAudience":
                MobileAds.shared.requestConfiguration.maxAdContentRating =
                    GADMaxAdContentRating.matureAudience
            default:
                print("maxAdContentRating can't find value")
            }
        }

    }

    func getRootVC() -> UIViewController? {
        var window: UIWindow? = UIApplication.shared.delegate?.window ?? nil

        if window == nil {
            let scene: UIWindowScene? = UIApplication.shared.connectedScenes.first as? UIWindowScene
            window = scene?.windows.filter({$0.isKeyWindow}).first
            if window == nil {
                window = scene?.windows.first
            }
        }
        return window?.rootViewController
    }
}

extension AdMobPlugin {
    // MARK: SDK initialization

    @objc public func initialize(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        bannerExecutor.plugin = self
        adInterstitialExecutor.plugin = self
        adRewardExecutor.plugin = self
        adRewardInterstitialExecutor.plugin = self
        adInterstitialExecutor.plugin = self
        nativeAdExecutor.plugin = self
        setRequestConfiguration(call)

        MobileAds.shared.start(completionHandler: nil)
        call.resolve([:])
    }

    // MARK: Banner ads

    @objc public func showBanner(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let adUnitID = getAdId(call, "ca-app-pub-3940256099942544/6300978111")
        let request = GADRequestWithOption(call.getBool("npa") ?? false)
        DispatchQueue.main.async {
            self.bannerExecutor.showBanner(call, request, adUnitID)
        }
    }

    @objc public func hideBanner(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async { self.bannerExecutor.hideBanner(call) }
    }

    @objc public func resumeBanner(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async { self.bannerExecutor.resumeBanner(call) }
    }

    @objc public func removeBanner(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async { self.bannerExecutor.removeBanner(call) }
    }

    // MARK: Native ads research preview

    @objc public func startNativeAdFeed(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async { self.nativeAdExecutor.startFeed(call) }
    }

    @objc public func destroyNativeAdFeed(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async { self.nativeAdExecutor.destroyFeed(call) }
    }

    @objc public func loadNativeAd(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let request = GADRequestWithOption(call.getBool("npa") ?? false)
        DispatchQueue.main.async {
            self.nativeAdExecutor.load(call, request: request)
        }
    }

    @objc public func updateNativeAdPlacements(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async { self.nativeAdExecutor.updatePlacements(call) }
    }

    @objc public func removeNativeAd(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        DispatchQueue.main.async { self.nativeAdExecutor.remove(call) }
    }
}

@_cdecl("init_plugin_admob_tauri")
public func initPlugin() -> Plugin {
    return AdMobPlugin()
}
