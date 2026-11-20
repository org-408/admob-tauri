package com.getcapacitor.community.admob.rewarded.models

import com.org408.admob.tauri.PluginCall

class SsvInfo(
    val customData: String? = null,
    val userId: String? = null) {

    constructor(pluginCall: PluginCall?) : this(
        pluginCall?.getObject("ssv")?.getString("customData"),
        pluginCall?.getObject("ssv")?.getString("userId")
    )

    constructor() : this(null, null)

    val hasInfo
        get(): Boolean {
            return customData != null || userId != null
        }
}