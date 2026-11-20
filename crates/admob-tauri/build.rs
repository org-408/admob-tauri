// The commands: one per method of @capacitor-community/admob (AdMobPlugin and the native ad bridge), plus the
// two Tauri's plugin listeners use. Keep in step with src/commands.rs, guest-js/commands.ts and permissions/default.toml
// (__tests__/apiParity.test.ts checks).
const COMMANDS: &[&str] = &[
  "initialize",
  "tracking_authorization_status",
  "request_consent_info",
  "show_privacy_options_form",
  "request_tracking_authorization",
  "show_consent_form",
  "reset_consent_info",
  "set_application_muted",
  "set_application_volume",
  "show_banner",
  "resume_banner",
  "hide_banner",
  "remove_banner",
  "start_native_ad_feed",
  "destroy_native_ad_feed",
  "load_native_ad",
  "update_native_ad_placements",
  "remove_native_ad",
  "capture_native_ad_snapshot",
  "prepare_native_ad_snapshot",
  "prepare_interstitial",
  "show_interstitial",
  "prepare_reward_video_ad",
  "show_reward_video_ad",
  "prepare_reward_interstitial_ad",
  "show_reward_interstitial_ad",
  "load_app_open",
  "show_app_open",
  "is_app_open_loaded",
  "register_listener",
  "remove_listener",
];

fn main() {
  tauri_plugin::Builder::new(COMMANDS)
    .android_path("android")
    .ios_path("ios")
    .build();
}
