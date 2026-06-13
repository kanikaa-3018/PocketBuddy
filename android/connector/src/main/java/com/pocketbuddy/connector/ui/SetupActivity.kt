package com.pocketbuddy.connector.ui

import android.Manifest
import android.app.Activity
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import com.pocketbuddy.connector.BuildConfig
import com.pocketbuddy.connector.PocketBuddyNotificationListener
import com.pocketbuddy.connector.config.ConnectorConfigStore
import com.pocketbuddy.connector.identity.DeviceIdentityStore
import com.pocketbuddy.connector.retry.WebhookRetryQueue

class SetupActivity : Activity() {
    private lateinit var statusText: TextView
    private lateinit var webhookUrlInput: EditText
    private lateinit var userIdInput: EditText
    private lateinit var webhookTokenInput: EditText
    private lateinit var configStore: ConnectorConfigStore
    private lateinit var identityStore: DeviceIdentityStore
    private lateinit var retryQueue: WebhookRetryQueue

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        configStore = ConnectorConfigStore(applicationContext)
        identityStore = DeviceIdentityStore(applicationContext)
        retryQueue = WebhookRetryQueue(applicationContext)
        setContentView(buildContentView())
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
    }

    private fun buildContentView(): ScrollView {
        statusText = TextView(this).apply {
            textSize = 15f
            setPadding(32, 32, 32, 24)
        }

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
            addView(statusText)
            addView(sectionLabel("Backend webhook URL"))
            webhookUrlInput = inputField(
                value = configStore.webhookUrl(),
                hint = "http://127.0.0.1:8000/api/ingest/notification",
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI,
            )
            addView(webhookUrlInput)
            addView(sectionLabel("PocketBuddy user ID"))
            userIdInput = inputField(
                value = configStore.userId().orEmpty(),
                hint = "Paste user id from web companion setup",
            )
            addView(userIdInput)
            addView(sectionLabel("Webhook token"))
            webhookTokenInput = inputField(
                value = configStore.webhookToken().orEmpty(),
                hint = "Optional server-issued token",
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD,
            )
            addView(webhookTokenInput)
            addView(actionButton("Save Connector Config") {
                saveConnectorConfig()
            })
            addView(actionButton("Reset Connector Config") {
                resetConnectorConfig()
            })
            addView(actionButton("Open Notification Access") {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            })
            addView(actionButton("Open App Notification Settings") {
                openAppNotificationSettings()
            })
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                addView(actionButton("Allow Test Notifications") {
                    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_POST_NOTIFICATIONS)
                })
            }
        }

        return ScrollView(this).apply {
            addView(
                content,
                ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                ),
            )
        }
    }

    private fun actionButton(label: String, onClick: () -> Unit): Button =
        Button(this).apply {
            text = label
            setAllCaps(false)
            setOnClickListener { onClick() }
        }

    private fun sectionLabel(label: String): TextView =
        TextView(this).apply {
            text = label
            textSize = 13f
            setPadding(8, 18, 8, 4)
        }

    private fun inputField(
        value: String,
        hint: String,
        inputType: Int = InputType.TYPE_CLASS_TEXT,
    ): EditText =
        EditText(this).apply {
            setText(value)
            this.hint = hint
            this.inputType = inputType
            setSingleLine(true)
        }

    private fun refreshStatus() {
        val notificationAccess = if (isNotificationAccessEnabled()) "enabled" else "disabled"
        val testNotifications = if (areAppNotificationsUsable()) "enabled" else "disabled"
        val userId = identityStore.userId() ?: "not set"

        statusText.text = buildString {
            appendLine("PocketBuddy Connector")
            appendLine()
            appendLine("Notification access: $notificationAccess")
            appendLine("App notifications: $testNotifications")
            appendLine("Queued retries: ${retryQueue.size()}")
            appendLine()
            appendLine("Device ID: ${identityStore.deviceId()}")
            appendLine("User ID: $userId")
            appendLine()
            appendLine("Webhook: ${configStore.webhookUrl()}")
            appendLine("Build default webhook: ${BuildConfig.POCKETBUDDY_WEBHOOK_URL}")
        }
    }

    private fun saveConnectorConfig() {
        configStore.save(
            webhookUrl = webhookUrlInput.text.toString(),
            userId = userIdInput.text.toString(),
            webhookToken = webhookTokenInput.text.toString(),
        )
        Toast.makeText(this, "Connector config saved", Toast.LENGTH_SHORT).show()
        refreshStatus()
    }

    private fun resetConnectorConfig() {
        configStore.clearRuntimeConfig()
        webhookUrlInput.setText(configStore.webhookUrl())
        userIdInput.setText(configStore.userId().orEmpty())
        webhookTokenInput.setText(configStore.webhookToken().orEmpty())
        Toast.makeText(this, "Connector config reset", Toast.LENGTH_SHORT).show()
        refreshStatus()
    }

    private fun isNotificationAccessEnabled(): Boolean {
        val enabledListeners = Settings.Secure.getString(
            contentResolver,
            "enabled_notification_listeners",
        ).orEmpty()
        val listenerComponent = ComponentName(this, PocketBuddyNotificationListener::class.java)
        return enabledListeners.split(":").any { it.equals(listenerComponent.flattenToString(), ignoreCase = true) }
    }

    private fun areAppNotificationsUsable(): Boolean =
        getSystemService(NotificationManager::class.java).areNotificationsEnabled() &&
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            } else {
                true
            }

    private fun openAppNotificationSettings() {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
        } else {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                .setData(Uri.parse("package:$packageName"))
        }
        startActivity(intent)
    }

    private companion object {
        private const val REQUEST_POST_NOTIFICATIONS = 1001
    }
}
