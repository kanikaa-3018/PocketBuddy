# PocketBuddy Backend

FastAPI backend for auth, profiles, transactions, subscriptions, check-ins, cart pools, and Android companion ingest.

## First-Time Setup

Run these from the repository root in PowerShell:

```powershell
py -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` before running the server:

```env
JWT_SECRET=replace_with_a_local_secret
MONGO_URI=mongodb://localhost:27017
PORT=8000
```

## Run Locally

Because `.env` is loaded relative to the current working directory, start FastAPI from `backend`:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

The API should be available at:

```text
http://127.0.0.1:8000
```

## Android Companion Endpoint

The Android connector posts normalized payment notifications to:

```http
POST /api/ingest/notification
```

The companion UI reads sync state from:

```http
GET /api/companion/logs
GET /api/profile
GET /api/transactions
```

For USB testing, keep the backend on port `8000` and run:

```powershell
$ADB = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $ADB -s <device-id> reverse tcp:8000 tcp:8000
```
