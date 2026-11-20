import Foundation
import Tauri

/// @capacitor-community/admob's plugin is written against Capacitor's `CAPPluginCall`. This is the part of that
/// surface it uses, on Tauri's `Invoke`, so the plugin's code stays upstream's line for line.
///
/// The arguments are the object the page sent (what `CAPPluginCall.options` holds). A rejection resolves a marked
/// result instead of rejecting (`PluginCall.rejectionKey`), and the Rust side turns it back into
/// `{ code, message, data }`, the error @capacitor-community/admob rejects with: Tauri's Rust side keeps only the
/// code and message of a rejection.
final class PluginCall {
    /// Also in the Rust side (`src/error.rs`)
    static let rejectionKey = "__admobTauriRejection"

    let invoke: Invoke
    let options: [String: Any]

    init(_ invoke: Invoke) {
        self.invoke = invoke
        self.options = PluginCall.parse(invoke.getRawArgs())
    }

    static func parse(_ rawArgs: String) -> [String: Any] {
        let data = Data(rawArgs.utf8)
        return ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]
    }

    var jsObjectRepresentation: [String: Any] {
        return options
    }

    func getString(_ key: String) -> String? {
        return options[key] as? String
    }

    func getString(_ key: String, _ defaultValue: String) -> String {
        return getString(key) ?? defaultValue
    }

    func getBool(_ key: String) -> Bool? {
        return options[key] as? Bool
    }

    func getBool(_ key: String, _ defaultValue: Bool) -> Bool {
        return getBool(key) ?? defaultValue
    }

    func getInt(_ key: String) -> Int? {
        return (options[key] as? NSNumber)?.intValue
    }

    func getInt(_ key: String, _ defaultValue: Int) -> Int {
        return getInt(key) ?? defaultValue
    }

    func getFloat(_ key: String) -> Float? {
        return (options[key] as? NSNumber)?.floatValue
    }

    func getFloat(_ key: String, _ defaultValue: Float) -> Float {
        return getFloat(key) ?? defaultValue
    }

    func getDouble(_ key: String) -> Double? {
        return (options[key] as? NSNumber)?.doubleValue
    }

    func getArray(_ key: String) -> [Any]? {
        return options[key] as? [Any]
    }

    func getArray(_ key: String, _ defaultValue: [Any]) -> [Any] {
        return getArray(key) ?? defaultValue
    }

    func getArray<T>(_ key: String, _ ofType: T.Type) -> [T]? {
        return options[key] as? [T]
    }

    func getObject(_ key: String) -> [String: Any]? {
        return options[key] as? [String: Any]
    }

    func resolve() {
        invoke.resolve()
    }

    func resolve(_ data: [String: Any]) {
        invoke.resolve(data.mapValues { Optional($0) })
    }

    func reject(_ message: String, _ code: String? = nil, _ error: Error? = nil, _ data: [String: Any]? = nil) {
        invoke.resolve(PluginCall.rejection(message, code, data).mapValues { Optional($0) })
    }

    /// The marked result a rejection travels as
    static func rejection(_ message: String, _ code: String?, _ data: [String: Any]?) -> [String: Any] {
        var rejection: [String: Any] = ["message": message]
        if let code {
            rejection["code"] = code
        }
        if let data {
            rejection["data"] = data
        }
        return [rejectionKey: rejection]
    }

    func unimplemented() {
        unimplemented("not implemented")
    }

    func unimplemented(_ message: String) {
        reject(message, "UNIMPLEMENTED")
    }

    func unavailable() {
        unavailable("not available")
    }

    func unavailable(_ message: String) {
        reject(message, "UNAVAILABLE")
    }
}
