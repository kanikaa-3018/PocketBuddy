# PocketBuddy Test Backend

Minimal FastAPI backend for testing the Android notification connector.

## Setup

```powershell
cd "C:\Users\nhnis\Desktop\Amazon Hackon\PocketBuddy\PocketBuddy\android"
py -m venv tools\ingest_test_backend\.venv
tools\ingest_test_backend\.venv\Scripts\Activate.ps1
py -m pip install -r tools\ingest_test_backend\requirements.txt
```

## Run

```powershell
uvicorn tools.ingest_test_backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check from the laptop:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Recent received Android events:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/ingest/recent
```

Events include `captureSource`, `deviceId`, and optional `userId` so you can distinguish `payment_app`, `sms_notification`, and `debug` payloads during testing.

If the same transaction arrives from both a payment app and an SMS notification, the backend keeps both raw events but marks later matches with:

```json
{
  "duplicate": true,
  "duplicateOf": "first-event-id"
}
```

Transaction IDs are the primary duplicate key. When a provider omits them, the test backend also checks for the same device, amount, direction, and a close notification timestamp so app + SMS copies of the same transaction do not inflate totals.

Canonical de-duplicated transactions:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/api/ingest/transactions?limit=10' | ConvertTo-Json -Depth 10
```

Use this endpoint for totals and UI display. It groups duplicate raw events and merges richer fields from the SMS copy, such as `transactionId` and `merchant`, when the payment-app notification arrived first.

## Physical Phone URL

For your current Ethernet adapter, use this in `android/local.properties`:

```properties
POCKETBUDDY_WEBHOOK_URL=http://10.125.3.79:8000/api/ingest/notification
```

After changing `local.properties`, reinstall the APK:

```powershell
cd "C:\Users\nhnis\Desktop\Amazon Hackon\PocketBuddy\PocketBuddy\android"
.\gradlew.bat :connector:installDebug
```
