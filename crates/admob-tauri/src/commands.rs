//! The commands. Each passes its arguments, as the page sent them, to the method of the same name in the
//! Swift / Kotlin plugin, and hands back what the plugin returns. The work is @capacitor-community/admob's.

use serde_json::Value;
use tauri::{
  ipc::{InvokeBody, Request},
  AppHandle, Runtime, Webview,
};

use crate::{AdmobExt, Result};

/// The arguments as the page sent them (the object @capacitor-community/admob's plugin receives)
fn args(request: &Request<'_>) -> Value {
  match request.body() {
    InvokeBody::Json(value) => value.clone(),
    InvokeBody::Raw(_) => Value::Object(Default::default()),
  }
}

macro_rules! commands {
  ($($name:ident => $method:literal),* $(,)?) => {
    $(
      #[tauri::command]
      pub(crate) async fn $name<R: Runtime>(
        app: AppHandle<R>,
        webview: Webview<R>,
        request: Request<'_>,
      ) -> Result<Value> {
        app.admob().call(&webview, $method, args(&request)).await
      }
    )*

    pub(crate) fn handler<R: Runtime>() -> impl Fn(tauri::ipc::Invoke<R>) -> bool + Send + Sync + 'static {
      tauri::generate_handler![$($name),*]
    }

    /// (command, method) — the Tauri command and the Swift / Kotlin method it calls
    #[allow(dead_code)]
    pub const COMMANDS: &[(&str, &str)] = &[$((stringify!($name), $method)),*];
  };
}

// AdMobPlugin (src/definitions.ts and the banner, consent, ... definitions), the native ad bridge, and the plugin
// listeners of Tauri (`addPluginListener`)
commands! {
  initialize => "initialize",
  tracking_authorization_status => "trackingAuthorizationStatus",
  request_consent_info => "requestConsentInfo",
  show_privacy_options_form => "showPrivacyOptionsForm",
  request_tracking_authorization => "requestTrackingAuthorization",
  show_consent_form => "showConsentForm",
  reset_consent_info => "resetConsentInfo",
  set_application_muted => "setApplicationMuted",
  set_application_volume => "setApplicationVolume",
  show_banner => "showBanner",
  resume_banner => "resumeBanner",
  hide_banner => "hideBanner",
  remove_banner => "removeBanner",
  start_native_ad_feed => "startNativeAdFeed",
  destroy_native_ad_feed => "destroyNativeAdFeed",
  load_native_ad => "loadNativeAd",
  update_native_ad_placements => "updateNativeAdPlacements",
  remove_native_ad => "removeNativeAd",
  capture_native_ad_snapshot => "captureNativeAdSnapshot",
  prepare_native_ad_snapshot => "prepareNativeAdSnapshot",
  prepare_interstitial => "prepareInterstitial",
  show_interstitial => "showInterstitial",
  prepare_reward_video_ad => "prepareRewardVideoAd",
  show_reward_video_ad => "showRewardVideoAd",
  prepare_reward_interstitial_ad => "prepareRewardInterstitialAd",
  show_reward_interstitial_ad => "showRewardInterstitialAd",
  load_app_open => "loadAppOpen",
  show_app_open => "showAppOpen",
  is_app_open_loaded => "isAppOpenLoaded",
  register_listener => "registerListener",
  remove_listener => "removeListener",
}
