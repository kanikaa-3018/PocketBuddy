# PocketBuddy Backend

FastAPI backend for auth, profiles, transactions, statement import, recurring commitments, food, travel, cart pools, check-ins, privacy controls, Account Aggregator sandbox flows, and Android companion ingest.

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
AWS_REGION=ap-south-1
CAMPUS_FOOD_S3_BUCKET=
CAMPUS_FOOD_S3_KEY=campus_food.json
BEDROCK_ENABLED=false
BEDROCK_MODEL_ID=us.amazon.nova-lite-v1:0
DEMO_MODE=false
```

`CAMPUS_FOOD_S3_BUCKET` is optional. When it is empty, the backend reads:

```text
data/campus_food.json
```

The food and travel AI endpoints also work without Bedrock credentials by returning deterministic fallback guidance.

## Run Locally

The backend settings loader reads both the repository root `.env` and `backend/.env`, so either command style is valid.

From the repository root:

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Or from `backend`:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

The API should be available at:

```text
http://127.0.0.1:8000
```

## Android Companion Endpoint

New Android connector builds post sanitized payment events to:

```http
POST /api/ingest/notification-v2
```

The older `/api/ingest/notification` route remains for legacy connector builds, but v2 rejects raw `text`/`body` payloads and accepts only structured transaction facts plus a masked preview.

The companion UI reads sync state from:

```http
GET /api/companion/logs
GET /api/profile
GET /api/transactions
```

Privacy-preserving connector v2 events are parsed on-device and send only structured transaction facts plus a masked `notification_preview`. The backend keeps the legacy ingest endpoint for older connector builds, but new connector payloads do not require raw notification/SMS text to be uploaded or persisted.

For USB testing, keep the backend on port `8000` and run:

```powershell
$ADB = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $ADB -s <device-id> reverse tcp:8000 tcp:8000
```

## Auth Privacy Defaults

Email/password auth is the default local/dev login path.

The phone login route is a demo placeholder unless a real OTP provider is integrated, so it is disabled by default:

```env
DEMO_PHONE_AUTH_ENABLED=false
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

Only set `DEMO_PHONE_AUTH_ENABLED=true` for an explicit demo environment where that tradeoff is understood. Do not use it as a production phone verification flow.

## Account Aggregator Sandbox

PocketBuddy includes a local Account Aggregator style consent sandbox for demos. It uses dummy records only and does not connect to live bank accounts:

```env
AA_SANDBOX_ENABLED=true
AA_SANDBOX_PROVIDER=local
AA_CALLBACK_SECRET=
```

Use `AA_SANDBOX_PROVIDER=local` to keep the built-in dummy-data consent lifecycle. The sandbox stores generated AA records separately from real transactions.

Authenticated frontend routes use:

```http
GET  /api/account-aggregator/status
POST /api/account-aggregator/sandbox/consents
POST /api/account-aggregator/sandbox/consents/{consent_id}/simulate
```

Provider callback placeholders are also available for sandbox wiring when `AA_CALLBACK_SECRET` is configured:

```http
POST /api/account-aggregator/Consent/Notification
POST /api/account-aggregator/FI/Notification
```

## Campus Food, OCR, And RAG

The frontend dashboard reads:

```http
GET /api/campus-food
```

The authenticated recommendation route is:

```http
POST /api/rag/food-rag
```

Menu scanning is review-first. If OCR is configured, extracted menu rows become pending review candidates. If `DEMO_MODE=true` and OCR is unavailable, the scanner can create venue-based demo candidates, but those candidates still stay in review and are not trusted recommendations immediately.

## Statement Import

Authenticated statement import routes:

```http
POST /api/statement-import/preview
POST /api/statement-import/commit
POST /api/statement-import/vendor-category
GET  /api/statement-import/batches
POST /api/statement-import/batches/{batch_id}/rollback
```

The import path supports CSV/TSV/TXT and text-based PDFs, including password-protected PDFs when `pypdf[crypto]` can decrypt them. Scanned PDFs require OCR and are intentionally not trusted by this parser.

For AWS deployment instructions, see:

```text
docs/aws-low-cost-setup.md
```
