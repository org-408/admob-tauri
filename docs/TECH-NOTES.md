# Technical notes

Decisions of the port and what differs from the Capacitor plugin.

## Bridge

- **Commands.** Each method of upstream's plugin (the 29 `@PluginMethod`s, including the Android-only native ad
  snapshot ones) is a Tauri command of the same name in snake_case. Rust (`src/commands.rs`) passes the arguments as
  the page sent them to the Swift / Kotlin method of the same name and returns the result.
- **Listeners.** Capacitor's `notifyListeners(event, data)` is Tauri's `Plugin.trigger(event, data)`; the page's
  `addListener(event, fn)` is `addPluginListener('admob-tauri', event, fn)` (commands `register_listener` /
  `remove_listener`, which Tauri's native `Plugin` class implements). `index.ts` wraps the result as
  `{ remove }`, Capacitor's `PluginListenerHandle`.
- **Rejections.** Tauri keeps only a rejection's `code` and `message` between native code and Rust (and iOS spreads
  `data` over the result). The Swift and Kotlin `PluginCall` shims therefore resolve a marked object
  (`__admobTauriRejection`) instead, and `src/error.rs` turns it back into `{ code, message, data }`; `bridge.ts` throws
  that as an `Error` with `code` and `data`.
- **Channels in arguments.** Tauri hands a plugin without a Rust command nothing to open a page's `Channel`; here the
  Rust command opens any channel id in its arguments (`mobile.rs`) so the native plugin could send on it.
- **Platform.** `init()` injects `window.__ADMOB_TAURI__.platform`; `index.ts` uses the native plugin on `ios` and
  `android`, and upstream's web stand-in (`web.ts`) elsewhere.

## Differences from Capacitor

- iOS: `bridge.webView` is the web view Tauri passes to `Plugin.load(webview:)`. The banner is added to the root view
  controller's view as upstream does.
- Android: the banner is added to `android.R.id.content` (a `FrameLayout`) with `FrameLayout.LayoutParams`. Upstream
  adds it to the content view's first child, which with Capacitor is a `CoordinatorLayout`; with Tauri the first child
  is the WebView itself. Capacitor's `bridge.getConfig()` (allowed origin rules) is replaced by `*` for the native ad
  placement message channel.
- Types that Capacitor's native layer exposes (`CAPPluginCall`, `JSObject`, `JSArray`) are shimmed
  (`ios/.../PluginCall.swift`, `android/.../PluginCall.kt`) with the part upstream's code uses.
- Android Java and Kotlin keep upstream's package (`com.getcapacitor.community.admob`) so diffs against upstream stay
  small; the Tauri plugin class is `com.org408.admob.tauri.AdmobPlugin`.

## Pitfalls met

- iOS 15 deployment target: set `IPHONEOS_DEPLOYMENT_TARGET=15.0` when building the example outside Xcode.
- `swift-rs` prints the whole `swift-frontend` command on a Swift error; search the output for `error:`.
- Swift `@objc` methods cannot take `PluginCall` (a Swift class); only the entry points `(_ invoke: Invoke)` are
  `@objc`, the executors' methods are plain.
