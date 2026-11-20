use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::{plugin::PluginApi, AppHandle, Runtime, Webview};

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<Admob<R>> {
  Ok(Admob(app.clone()))
}

/// Google Mobile Ads is an iOS and Android SDK. On desktop the TypeScript side never calls these commands:
/// like @capacitor-community/admob on the web, it uses its stand-in (`web.ts`)
pub struct Admob<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

impl<R: Runtime> Admob<R> {
  pub async fn call(
    &self,
    _webview: &Webview<R>,
    method: &str,
    _args: Value,
  ) -> crate::Result<Value> {
    Err(crate::Error::Unimplemented(format!(
      "\"AdMob.{method}()\" is not implemented on desktop"
    )))
  }
}
