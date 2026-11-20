use std::str::FromStr;

use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::{
  ipc::JavaScriptChannelId,
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime, Webview,
};

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_admob_tauri);

pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<Admob<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("com.org408.admob.tauri", "AdmobPlugin")?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_admob_tauri)?;
  Ok(Admob(handle))
}

/// Passes each call to the Swift / Kotlin plugin as it came from the page (the shapes are the Capacitor plugin's, not Rust's)
pub struct Admob<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Admob<R> {
  pub async fn call(
    &self,
    webview: &Webview<R>,
    method: &str,
    args: Value,
  ) -> crate::Result<Value> {
    open_channels(&args, webview);
    let value: Value = self.0.run_mobile_plugin_async(method, args).await?;
    crate::error::from_native(value)
  }
}

/// The page's channels in the arguments (the customer info listener, the log handler), opened so the plugin can
/// send on them — what Tauri does for the commands it hands to a plugin without a Rust command
fn open_channels<R: Runtime>(args: &Value, webview: &Webview<R>) {
  if let Value::Object(map) = args {
    for value in map.values() {
      if let Value::String(s) = value {
        if let Ok(id) = JavaScriptChannelId::from_str(s) {
          let _ = id.channel_on::<R, ()>(webview.clone());
        }
      }
    }
  }
}
