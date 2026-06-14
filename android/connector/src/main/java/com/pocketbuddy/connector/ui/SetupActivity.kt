package com.pocketbuddy.connector.ui

import android.Manifest
import android.app.Activity
import android.app.NotificationManager
import android.content.ClipboardManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
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
    private lateinit var statusDetailText: TextView
    private lateinit var diagnosticsText: TextView
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
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(24) + systemBarHeight("status_bar_height"), dp(18), dp(28) + systemBarHeight("navigation_bar_height"))
            addView(titleText("PocketBuddy Connector"))
            addView(bodyText("Link this phone once, then PocketBuddy can sync UPI notifications from payment apps and SMS alerts."))
            addView(statusCard())
            addView(configCard())
            addView(permissionCard())
            addView(diagnosticsCard())
        }

        return ScrollView(this).apply {
            setBackgroundColor(Color.rgb(246, 247, 249))
            isFillViewport = true
            addView(
                content,
                ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                ),
            )
        }
    }

    private fun statusCard(): LinearLayout {
        statusText = TextView(this).apply {
            textSize = 18f
            typeface = Typeface.DEFAULT_BOLD
        }
        statusDetailText = TextView(this).apply {
            textSize = 13f
            setTextColor(Color.rgb(93, 100, 112))
            setPadding(0, dp(6), 0, 0)
        }

        return sectionCard().apply {
            addView(statusText)
            addView(statusDetailText)
        }
    }

    private fun configCard(): LinearLayout =
        sectionCard().apply {
            addView(sectionTitle("1. Paste web app config"))
            addView(bodyText("Open Companion Device in PocketBuddy web, copy the connector config, then paste it here."))
            addView(secondaryButton("Paste copied config") {
                pasteConnectorConfig()
            })
            addView(sectionLabel("Backend webhook URL"))
            webhookUrlInput = inputField(
                value = configStore.webhookUrl(),
                hint = "http://<server-ip>/api/ingest/notification",
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI,
            )
            addView(webhookUrlInput)
            addView(sectionLabel("PocketBuddy user ID"))
            userIdInput = inputField(
                value = configStore.userId().orEmpty(),
                hint = "Paste user ID from Companion Device",
            )
            addView(userIdInput)
            addView(sectionLabel("Webhook token, optional"))
            webhookTokenInput = inputField(
                value = configStore.webhookToken().orEmpty(),
                hint = "Leave empty unless backend gives a token",
                inputType = InputType.TYPE_CLASS_TEXT,
                minLines = 1,
                maxLines = 2,
            )
            addView(webhookTokenInput)
            addView(primaryButton("Save connector config") {
                saveConnectorConfig()
            })
            addView(secondaryButton("Reset saved config") {
                resetConnectorConfig()
            })
        }

    private fun permissionCard(): LinearLayout =
        sectionCard().apply {
            addView(sectionTitle("2. Enable phone permissions"))
            addView(bodyText("Notification Access lets this connector read payment notifications shown by apps like Kotak, Google Pay, PhonePe, Paytm, and Google Messages."))
            addView(primaryButton("Open notification access") {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            })
            addView(secondaryButton("Open app notification settings") {
                openAppNotificationSettings()
            })
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                addView(secondaryButton("Allow test notifications") {
                    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_POST_NOTIFICATIONS)
                })
            }
        }

    private fun diagnosticsCard(): LinearLayout {
        diagnosticsText = TextView(this).apply {
            textSize = 12f
            setTextColor(Color.rgb(93, 100, 112))
            setPadding(0, dp(10), 0, 0)
            setTextIsSelectable(true)
        }
        return sectionCard().apply {
            addView(sectionTitle("3. Verify from web"))
            addView(bodyText("Send a small UPI test payment. Then open Companion Device in PocketBuddy web and check Recent Sync Activity."))
            addView(diagnosticsText)
        }
    }

    private fun primaryButton(label: String, onClick: () -> Unit): Button =
        Button(this).apply {
            text = label
            setAllCaps(false)
            textSize = 14f
            setTextColor(Color.WHITE)
            background = rounded(Color.rgb(31, 41, 55), dp(10))
            minHeight = dp(50)
            gravity = Gravity.CENTER
            setPadding(dp(14), dp(10), dp(14), dp(10))
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply {
                setMargins(0, dp(14), 0, 0)
            }
            setOnClickListener { onClick() }
        }

    private fun secondaryButton(label: String, onClick: () -> Unit): Button =
        Button(this).apply {
            text = label
            setAllCaps(false)
            textSize = 14f
            setTextColor(Color.rgb(31, 41, 55))
            background = rounded(Color.WHITE, dp(10), Color.rgb(216, 222, 233))
            minHeight = dp(50)
            gravity = Gravity.CENTER
            setPadding(dp(14), dp(10), dp(14), dp(10))
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply {
                setMargins(0, dp(10), 0, 0)
            }
            setOnClickListener { onClick() }
        }

    private fun sectionLabel(label: String): TextView =
        TextView(this).apply {
            text = label
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.rgb(69, 75, 86))
            setPadding(0, dp(16), 0, dp(5))
        }

    private fun inputField(
        value: String,
        hint: String,
        inputType: Int = InputType.TYPE_CLASS_TEXT,
        minLines: Int = 2,
        maxLines: Int = 4,
    ): EditText =
        EditText(this).apply {
            setText(value)
            this.hint = hint
            this.inputType = inputType or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            setSingleLine(false)
            setHorizontallyScrolling(false)
            this.minLines = minLines
            this.maxLines = maxLines
            minHeight = dp(if (minLines <= 1) 54 else 70)
            gravity = Gravity.TOP or Gravity.START
            textSize = 15f
            setTextColor(Color.rgb(17, 24, 39))
            setHintTextColor(Color.rgb(136, 144, 158))
            setPadding(dp(14), dp(10), dp(14), dp(10))
            background = rounded(Color.WHITE, dp(8), Color.rgb(216, 222, 233))
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            )
        }

    private fun refreshStatus() {
        val notificationAccessEnabled = isNotificationAccessEnabled()
        val appNotificationsEnabled = areAppNotificationsUsable()
        val userId = identityStore.userId()
        val ready = notificationAccessEnabled && !userId.isNullOrBlank()

        statusText.text = if (ready) "Ready to sync" else "Setup needed"
        statusText.setTextColor(if (ready) Color.rgb(22, 101, 52) else Color.rgb(146, 64, 14))
        statusDetailText.text = when {
            !notificationAccessEnabled -> "Next step: open Notification Access and enable PocketBuddy."
            userId.isNullOrBlank() -> "Next step: paste and save the user ID from PocketBuddy web."
            else -> "This phone can now send payment events to PocketBuddy."
        }
        diagnosticsText.text = buildString {
            appendLine("Notification access: ${if (notificationAccessEnabled) "enabled" else "disabled"}")
            appendLine("App notifications: ${if (appNotificationsEnabled) "enabled" else "disabled"}")
            appendLine("Queued retries: ${retryQueue.size()}")
            appendLine("User ID: ${userId ?: "not set"}")
            appendLine("Device ID: ${identityStore.deviceId()}")
            appendLine("Webhook: ${configStore.webhookUrl()}")
            appendLine("Build default: ${BuildConfig.POCKETBUDDY_WEBHOOK_URL}")
        }
    }

    private fun saveConnectorConfig() {
        val webhookUrl = webhookUrlInput.text.toString().trim()
        val userId = userIdInput.text.toString().trim()

        if (!webhookUrl.startsWith("http://") && !webhookUrl.startsWith("https://")) {
            webhookUrlInput.error = "Use a full http:// or https:// URL"
            return
        }

        if (userId.isBlank()) {
            userIdInput.error = "Paste the user ID from PocketBuddy web"
            return
        }

        configStore.save(
            webhookUrl = webhookUrl,
            userId = userId,
            webhookToken = webhookTokenInput.text.toString(),
        )
        Toast.makeText(this, "Saved. Now enable Notification Access.", Toast.LENGTH_LONG).show()
        refreshStatus()
    }

    private fun pasteConnectorConfig() {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val pastedText = clipboard.primaryClip
            ?.takeIf { it.itemCount > 0 }
            ?.getItemAt(0)
            ?.coerceToText(this)
            ?.toString()
            .orEmpty()
            .trim()

        if (pastedText.isBlank()) {
            Toast.makeText(this, "Clipboard is empty", Toast.LENGTH_SHORT).show()
            return
        }

        val values = pastedText
            .lineSequence()
            .mapNotNull { line ->
                val parts = line.split("=", limit = 2)
                if (parts.size == 2) parts[0].trim() to parts[1].trim() else null
            }
            .toMap()

        var filled = false
        values["POCKETBUDDY_WEBHOOK_URL"]?.takeIf { it.isNotBlank() }?.let {
            webhookUrlInput.setText(it)
            filled = true
        }
        values["POCKETBUDDY_USER_ID"]?.takeIf { it.isNotBlank() }?.let {
            userIdInput.setText(it)
            filled = true
        }
        values["POCKETBUDDY_WEBHOOK_TOKEN"]?.let {
            webhookTokenInput.setText(it)
            filled = true
        }

        if (filled) {
            Toast.makeText(this, "Config pasted. Review and tap Save.", Toast.LENGTH_LONG).show()
        } else {
            Toast.makeText(this, "No PocketBuddy config found in clipboard", Toast.LENGTH_LONG).show()
        }
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

    private fun titleText(text: String): TextView =
        TextView(this).apply {
            this.text = text
            textSize = 24f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.rgb(17, 24, 39))
            setPadding(0, 0, 0, dp(10))
        }

    private fun sectionTitle(text: String): TextView =
        TextView(this).apply {
            this.text = text
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.rgb(17, 24, 39))
            setPadding(0, 0, 0, dp(8))
        }

    private fun bodyText(text: String): TextView =
        TextView(this).apply {
            this.text = text
            textSize = 13f
            setTextColor(Color.rgb(93, 100, 112))
            setLineSpacing(dp(2).toFloat(), 1.05f)
            setPadding(0, 0, 0, dp(8))
        }

    private fun sectionCard(): LinearLayout =
        LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(16))
            background = rounded(Color.WHITE, dp(16), Color.rgb(229, 233, 240))
            gravity = Gravity.START
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply {
                setMargins(0, dp(12), 0, 0)
            }
        }

    private fun rounded(
        color: Int,
        radius: Int,
        strokeColor: Int? = null,
    ): GradientDrawable =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = radius.toFloat()
            strokeColor?.let { setStroke(dp(1), it) }
        }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun systemBarHeight(resourceName: String): Int {
        val resourceId = resources.getIdentifier(resourceName, "dimen", "android")
        return if (resourceId > 0) resources.getDimensionPixelSize(resourceId) else 0
    }

    private companion object {
        private const val REQUEST_POST_NOTIFICATIONS = 1001
    }
}
