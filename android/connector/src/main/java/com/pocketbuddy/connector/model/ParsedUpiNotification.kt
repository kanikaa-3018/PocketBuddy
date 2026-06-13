package com.pocketbuddy.connector.model

enum class TransactionDirection {
    DEBIT,
    CREDIT,
}

enum class NotificationCaptureSource(val apiValue: String) {
    PAYMENT_APP("payment_app"),
    SMS_NOTIFICATION("sms_notification"),
    DEBUG("debug"),
    ;

    companion object {
        fun fromApiValue(value: String): NotificationCaptureSource =
            entries.first { it.apiValue == value }
    }
}

data class ParsedUpiNotification(
    val sourceApp: String,
    val captureSource: NotificationCaptureSource,
    val amount: Double,
    val currency: String,
    val direction: TransactionDirection,
    val merchant: String?,
    val transactionId: String?,
)
