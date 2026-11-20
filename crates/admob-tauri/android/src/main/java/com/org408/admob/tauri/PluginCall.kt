package com.org408.admob.tauri

import app.tauri.plugin.Invoke
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

// @capacitor-community/admob's Android plugin is written against Capacitor's PluginCall, JSObject and JSArray. These
// are the parts of them it uses, with Capacitor's behaviour, on Tauri's Invoke, so the plugin's code stays the
// original's (apart from the import).
//
// The arguments are the object the page sent (what PluginCall.getData() holds). A rejection resolves a marked result
// instead of rejecting (REJECTION_KEY), and the Rust side turns it back into { code, message, data }, the error
// @capacitor-community/admob rejects with: Tauri's Rust side keeps only code and message of a rejection.

/** Also in the Rust side (src/error.rs) */
const val REJECTION_KEY = "__admobTauriRejection"

open class PluginCall(val invoke: Invoke?, val data: JSObject, private val respond: (JSONObject?) -> Unit) {
    constructor(invoke: Invoke) : this(invoke, parse(invoke.getRawArgs()), { result ->
        if (result == null) invoke.resolve() else invoke.resolve(app.tauri.plugin.JSObject(result.toString()))
    })

    companion object {
        @JvmStatic
        fun parse(rawArgs: String): JSObject = try {
            JSObject(rawArgs)
        } catch (ex: JSONException) {
            JSObject()
        }

        /** The marked result a rejection travels as */
        @JvmStatic
        fun rejection(msg: String?, code: String?, data: JSONObject?): JSObject {
            val rejection = JSObject()
            rejection.put("message", msg ?: "")
            if (code != null) rejection.put("code", code)
            if (data != null) rejection.put("data", data)
            return JSObject().put(REJECTION_KEY, rejection)
        }
    }

    fun resolve(data: JSONObject?) = respond(data)

    fun resolve() = respond(null)

    fun reject(msg: String?, code: String?, ex: Exception?, data: JSObject?) = respond(rejection(msg, code, data))

    fun reject(msg: String?, ex: Exception?, data: JSObject?) = reject(msg, null, ex, data)

    fun reject(msg: String?, code: String?, data: JSObject?) = reject(msg, code, null, data)

    fun reject(msg: String?, code: String?, ex: Exception?) = reject(msg, code, ex, null)

    fun reject(msg: String?, data: JSObject?) = reject(msg, null, null, data)

    fun reject(msg: String?, ex: Exception?) = reject(msg, null, ex, null)

    fun reject(msg: String?, code: String?) = reject(msg, code, null, null)

    fun reject(msg: String?) = reject(msg, null, null, null)

    fun unimplemented() = unimplemented("not implemented")

    fun unimplemented(msg: String) = reject(msg, "UNIMPLEMENTED", null, null)

    fun unavailable() = unavailable("not available")

    fun unavailable(msg: String) = reject(msg, "UNAVAILABLE", null, null)

    fun getString(name: String): String? = getString(name, null)

    fun getString(name: String, defaultValue: String?): String? = (data.opt(name) as? String) ?: defaultValue

    fun getInt(name: String): Int? = getInt(name, null)

    fun getInt(name: String, defaultValue: Int?): Int? = (data.opt(name) as? Int) ?: defaultValue

    fun getLong(name: String): Long? = when (val value = data.opt(name)) {
        is Long -> value
        is Int -> value.toLong()
        else -> null
    }

    fun getFloat(name: String): Float? = getFloat(name, null)

    fun getFloat(name: String, defaultValue: Float?): Float? = when (val value = data.opt(name)) {
        is Float -> value
        is Double -> value.toFloat()
        is Int -> value.toFloat()
        else -> defaultValue
    }

    fun getDouble(name: String): Double? = when (val value = data.opt(name)) {
        is Double -> value
        is Float -> value.toDouble()
        is Int -> value.toDouble()
        else -> null
    }

    fun getBoolean(name: String): Boolean? = getBoolean(name, null)

    fun getBoolean(name: String, defaultValue: Boolean?): Boolean? = (data.opt(name) as? Boolean) ?: defaultValue

    fun getObject(name: String): JSObject? = (data.opt(name) as? JSONObject)?.let { JSObject.fromJSONObject(it) }

    fun getObject(name: String, defaultValue: JSObject?): JSObject? = getObject(name) ?: defaultValue

    fun getArray(name: String): JSArray? = getArray(name, null)

    fun getArray(name: String, defaultValue: JSArray?): JSArray? =
        (data.opt(name) as? JSONArray)?.let { array -> JSArray((0 until array.length()).map { array.get(it) }) } ?: defaultValue

    fun hasOption(name: String): Boolean = data.has(name)
}

/** Capacitor's JSObject: getters that give null for a missing key instead of throwing */
open class JSObject : JSONObject {
    constructor() : super()

    @Throws(JSONException::class)
    constructor(json: String) : super(json)

    constructor(obj: JSONObject, names: Array<String>) : super(obj, names)

    companion object {
        @JvmStatic
        fun fromJSONObject(obj: JSONObject): JSObject = JSObject(obj, obj.keys().asSequence().toList().toTypedArray())
    }

    override fun getString(key: String): String? = getString(key, null)

    fun getString(key: String, defaultValue: String?): String? {
        try {
            val value = super.getString(key)
            if (!super.isNull(key)) return value
        } catch (ex: JSONException) {
        }
        return defaultValue
    }

    fun getInteger(key: String): Int? = getInteger(key, null)

    fun getInteger(key: String, defaultValue: Int?): Int? = try {
        super.getInt(key)
    } catch (e: JSONException) {
        defaultValue
    }

    fun getBool(key: String): Boolean? = getBool(key, null)

    fun getBool(key: String, defaultValue: Boolean?): Boolean? = try {
        super.getBoolean(key)
    } catch (e: JSONException) {
        defaultValue
    }

    fun getJSObject(name: String): JSObject? = (opt(name) as? JSONObject)?.let { fromJSONObject(it) }

    override fun put(key: String, value: Boolean): JSObject = apply { super.put(key, value) }

    override fun put(key: String, value: Int): JSObject = apply { super.put(key, value) }

    override fun put(key: String, value: Long): JSObject = apply { super.put(key, value) }

    override fun put(key: String, value: Double): JSObject = apply { super.put(key, value) }

    override fun put(key: String, value: Any?): JSObject = apply { super.put(key, value) }

    fun put(key: String, value: String?): JSObject = apply { super.put(key, value) }
}

/** Capacitor's JSArray */
open class JSArray : JSONArray {
    constructor() : super()

    constructor(copyFrom: Collection<*>) : super(copyFrom)

    @Throws(JSONException::class)
    constructor(json: String) : super(json)

    @Throws(JSONException::class)
    @Suppress("UNCHECKED_CAST")
    fun <E> toList(): List<E> = (0 until length()).map {
        try {
            get(it) as E
        } catch (ex: Exception) {
            throw JSONException("Not all items are instances of the given type")
        }
    }
}
