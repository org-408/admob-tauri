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
  link_ios_frameworks();
}

/// The Google Mobile Ads SDK and the User Messaging Platform are binary frameworks (xcframeworks) that Swift Package
/// Manager downloads next to the plugin's static library; the library only names them. An app links its Rust code
/// as one static library (`libapp.a`) and Xcode then links that, so the frameworks have to be inside it: each one's
/// static archive, cut to the target's architecture, is linked into this crate as a static library (Cargo bundles it
/// into the app's `staticlib`; the app's `cdylib` links it too).
fn link_ios_frameworks() {
  if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("ios") {
    return;
  }
  let target = std::env::var("TARGET").unwrap_or_default();
  let simulator = target.ends_with("-sim") || target.starts_with("x86_64");
  let arch = if target.starts_with("x86_64") {
    "x86_64"
  } else {
    "arm64"
  };
  let out = std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap());
  let artifacts = out.join("swift-rs").join("admob-tauri").join("artifacts");
  // What the Google SDKs need from the system (their documentation lists them)
  for framework in [
    "AdSupport",
    "AppTrackingTransparency",
    "AudioToolbox",
    "AVFoundation",
    "CFNetwork",
    "CoreGraphics",
    "CoreMedia",
    "CoreTelephony",
    "CoreVideo",
    "MediaPlayer",
    "MessageUI",
    "QuartzCore",
    "Security",
    "StoreKit",
    "SystemConfiguration",
    "SafariServices",
    "WebKit",
  ] {
    println!("cargo:rustc-link-lib=framework={framework}");
  }
  println!("cargo:rustc-link-lib=c++");
  println!("cargo:rustc-link-lib=z");
  println!("cargo:rustc-link-lib=sqlite3");
  println!("cargo:rustc-link-search=native={}", out.display());
  let mut dirs = vec![artifacts];
  while let Some(dir) = dirs.pop() {
    let Ok(entries) = std::fs::read_dir(&dir) else {
      continue;
    };
    for entry in entries.flatten() {
      let path = entry.path();
      let name = entry.file_name().to_string_lossy().into_owned();
      if name == "extract" {
        continue;
      }
      let Some(stem) = name.strip_suffix(".xcframework") else {
        if path.is_dir() {
          dirs.push(path);
        }
        continue;
      };
      // slices are "ios-arm64" (devices) and "ios-arm64_x86_64-simulator"
      let Ok(slices) = std::fs::read_dir(&path) else {
        continue;
      };
      for slice in slices.flatten() {
        let slice_name = slice.file_name().to_string_lossy().into_owned();
        if !slice_name.starts_with("ios-") || slice_name.contains("simulator") != simulator {
          continue;
        }
        let archive = slice.path().join(format!("{stem}.framework")).join(stem);
        let thin = out.join(format!("lib{stem}.a"));
        let status = std::process::Command::new("lipo")
          .arg(&archive)
          .args(["-thin", arch, "-output"])
          .arg(&thin)
          .status();
        // A framework with one architecture only is not "fat": use it as it is
        if !status.is_ok_and(|s| s.success()) {
          std::fs::copy(&archive, &thin).expect("copies the framework's archive");
        }
        println!("cargo:rustc-link-lib=static={stem}");
        println!("cargo:rerun-if-changed={}", archive.display());
      }
    }
  }
}
