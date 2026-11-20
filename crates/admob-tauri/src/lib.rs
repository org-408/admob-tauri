//! Google AdMob for Tauri 2 on iOS and Android.
//!
//! A port of [`@capacitor-community/admob`](https://github.com/capacitor-community/admob) 8.3.0: every method of
//! its `AdMobPlugin`, with the same names, arguments, results and events. The work is Google Mobile Ads' and the
//! User Messaging Platform's, called from the Swift and Kotlin plugins in `ios/` and `android/` as the Capacitor
//! plugin calls it. Rust only passes each call through. Not an official Tauri plugin.
//!
//! ```rust,ignore
//! tauri::Builder::default()
//!   .plugin(admob_tauri::init())
//! ```
//!
//! Allow the commands in a capability with `"admob-tauri:default"` (every command), then use the TypeScript API
//! (`import { AdMob } from 'admob-tauri'`).

use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;

pub use error::{Error, Result};

#[cfg(desktop)]
pub use desktop::Admob;
#[cfg(mobile)]
pub use mobile::Admob;

/// The plugin's name: the Tauri plugin, its permissions (`admob-tauri:default`) and the npm package
pub const PLUGIN_NAME: &str = "admob-tauri";

/// The commands as (Tauri command, Swift / Kotlin method), in the order of the plugin's methods
pub const COMMANDS: &[(&str, &str)] = commands::COMMANDS;

/// Where the plugin runs: the TypeScript side calls the native plugin on `ios` and `android`, and otherwise uses
/// the same stand-in as @capacitor-community/admob on the web (`web.ts`)
pub fn platform() -> &'static str {
  if cfg!(target_os = "ios") {
    "ios"
  } else if cfg!(target_os = "android") {
    "android"
  } else {
    "desktop"
  }
}

/// Access to the plugin from Rust (`app.admob()`)
pub trait AdmobExt<R: Runtime> {
  fn admob(&self) -> &Admob<R>;
}

impl<R: Runtime, T: Manager<R>> AdmobExt<R> for T {
  fn admob(&self) -> &Admob<R> {
    self.state::<Admob<R>>().inner()
  }
}

/// Initializes the plugin
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new(PLUGIN_NAME)
    .js_init_script(format!(
      "Object.defineProperty(window, '__ADMOB_TAURI__', {{ value: Object.freeze({{ platform: '{}' }}) }});",
      platform()
    ))
    .invoke_handler(commands::handler())
    .setup(|app, api| {
      #[cfg(mobile)]
      let admob = mobile::init(app, api)?;
      #[cfg(desktop)]
      let admob = desktop::init(app, api)?;
      app.manage(admob);
      Ok(())
    })
    .build()
}

#[cfg(test)]
mod tests {
  use super::*;

  /// snake_case as heck (and so Tauri) does it: requestConsentInfo → request_consent_info
  fn snake(name: &str) -> String {
    let chars: Vec<char> = name.chars().collect();
    let mut out = String::new();
    for (i, c) in chars.iter().enumerate() {
      if i > 0 && c.is_ascii_uppercase() {
        let prev = chars[i - 1];
        let next_lower = chars.get(i + 1).is_some_and(|n| n.is_ascii_lowercase());
        if prev.is_ascii_lowercase() || (prev.is_ascii_uppercase() && next_lower) {
          out.push('_');
        }
      }
      out.push(c.to_ascii_lowercase());
    }
    out
  }

  #[test]
  fn commands_are_snake_case_of_their_methods() {
    for (command, method) in COMMANDS {
      assert_eq!(*command, snake(method), "{method}");
    }
  }

  #[test]
  fn every_command_once() {
    let mut names: Vec<_> = COMMANDS.iter().map(|(c, _)| *c).collect();
    names.sort();
    names.dedup();
    assert_eq!(names.len(), COMMANDS.len());
    assert_eq!(COMMANDS.len(), 31);
  }
}
