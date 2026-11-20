use serde::{ser::SerializeMap, Serialize, Serializer};
use serde_json::Value;

pub type Result<T> = std::result::Result<T, Error>;

/// The key the Swift / Kotlin plugin marks a rejection with. The plugin resolves `{ [key]: { code, message, data } }`
/// instead of rejecting, because neither bridge keeps a rejection whole:
/// - Tauri's iOS `reject` spreads `data` over the top level, which can overwrite the string `code`
/// - Rust's `run_mobile_plugin` keeps only `code` and `message` of a rejection
///
/// [`from_native`] turns it back into the error @capacitor-community/admob rejects with.
#[cfg_attr(desktop, allow(dead_code))]
pub const REJECTION_KEY: &str = "__admobTauriRejection";

#[derive(Debug, thiserror::Error)]
pub enum Error {
  /// A rejection by the Swift / Kotlin plugin, in the shape @capacitor-community/admob rejects with: a message and
  /// optionally a code (such as `UNIMPLEMENTED`) and data.
  #[error("{message}")]
  Rejected {
    code: Option<String>,
    message: String,
    data: Option<Value>,
  },
  /// The command has no implementation here (desktop: the TypeScript side uses its web stand-in instead)
  #[error("{0}")]
  Unimplemented(String),
  #[cfg(mobile)]
  #[error(transparent)]
  PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
}

/// The plugin's answer: the marked rejection back as [`Error::Rejected`], anything else as the result
#[cfg_attr(desktop, allow(dead_code))]
pub fn from_native(value: Value) -> Result<Value> {
  let Some(rejection) = value.get(REJECTION_KEY) else {
    return Ok(value);
  };
  Err(Error::Rejected {
    code: rejection
      .get("code")
      .and_then(Value::as_str)
      .map(str::to_owned),
    message: rejection
      .get("message")
      .and_then(Value::as_str)
      .unwrap_or_default()
      .to_owned(),
    data: rejection.get("data").filter(|d| !d.is_null()).cloned(),
  })
}

/// The page gets `{ code, message, data }`, what @capacitor-community/admob rejects with (`CapacitorException`), and the
/// JS side throws it as an `Error` with `code` and `data` (`bridge.ts`)
impl Serialize for Error {
  fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
    let mut map = serializer.serialize_map(None)?;
    match self {
      Error::Rejected {
        code,
        message,
        data,
      } => {
        if let Some(code) = code {
          map.serialize_entry("code", code)?;
        }
        map.serialize_entry("message", message)?;
        if let Some(data) = data {
          map.serialize_entry("data", data)?;
        }
      }
      Error::Unimplemented(message) => {
        map.serialize_entry("code", "UNIMPLEMENTED")?;
        map.serialize_entry("message", message)?;
      }
      #[cfg(mobile)]
      Error::PluginInvoke(tauri::plugin::mobile::PluginInvokeError::InvokeRejected(r)) => {
        if let Some(code) = &r.code {
          map.serialize_entry("code", code)?;
        }
        map.serialize_entry("message", r.message.as_deref().unwrap_or_default())?;
      }
      #[cfg(mobile)]
      Error::PluginInvoke(e) => {
        map.serialize_entry("message", &e.to_string())?;
      }
    }
    map.end()
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  #[test]
  fn a_result_passes_through() {
    let value = json!({ "status": "authorized" });
    assert_eq!(from_native(value.clone()).unwrap(), value);
    assert_eq!(from_native(Value::Null).unwrap(), Value::Null);
  }

  #[test]
  fn a_rejection_comes_back_whole() {
    let error = from_native(json!({
      REJECTION_KEY: { "code": "3", "message": "No fill", "data": { "x": 1 } }
    }))
    .unwrap_err();
    assert_eq!(
      serde_json::to_value(&error).unwrap(),
      json!({ "code": "3", "message": "No fill", "data": { "x": 1 } })
    );
  }

  #[test]
  fn a_rejection_without_code_or_data() {
    let error =
      from_native(json!({ REJECTION_KEY: { "message": "muted property cannot be null" } }))
        .unwrap_err();
    assert_eq!(
      serde_json::to_value(&error).unwrap(),
      json!({ "message": "muted property cannot be null" })
    );
    let error = from_native(json!({
      REJECTION_KEY: { "code": "UNIMPLEMENTED", "message": "no", "data": null }
    }))
    .unwrap_err();
    assert_eq!(
      serde_json::to_value(&error).unwrap(),
      json!({ "code": "UNIMPLEMENTED", "message": "no" })
    );
  }

  #[test]
  fn unimplemented() {
    assert_eq!(
      serde_json::to_value(Error::Unimplemented("no".into())).unwrap(),
      json!({ "code": "UNIMPLEMENTED", "message": "no" })
    );
  }
}
