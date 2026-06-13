package com.pocketbuddy.connector.identity

import android.content.Context
import com.pocketbuddy.connector.BuildConfig
import java.util.UUID

class DeviceIdentityStore(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun deviceId(): String {
        preferences.getString(KEY_DEVICE_ID, null)?.let { return it }

        val generatedId = UUID.randomUUID().toString()
        preferences.edit().putString(KEY_DEVICE_ID, generatedId).apply()
        return generatedId
    }

    fun userId(): String? =
        BuildConfig.POCKETBUDDY_USER_ID.trim().takeIf(String::isNotBlank)

    private companion object {
        private const val PREFERENCES_NAME = "pocketbuddy_identity"
        private const val KEY_DEVICE_ID = "device_id"
    }
}
