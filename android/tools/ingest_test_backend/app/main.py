from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field

APP_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = APP_ROOT / "data"
EVENT_LOG = DATA_DIR / "notification-events.ndjson"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("pocketbuddy.backend")

app = FastAPI(title="PocketBuddy Test Backend", version="0.1.0")


class NotificationPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    packageName: str = Field(min_length=1)
    text: str = Field(min_length=1)
    timestamp: int
    sourceApp: str | None = None
    captureSource: Literal["payment_app", "sms_notification", "debug"] | None = None
    deviceId: str | None = None
    userId: str | None = None
    amount: float | None = Field(default=None, ge=0)
    currency: str | None = "INR"
    direction: Literal["debit", "credit"] | None = None
    merchant: str | None = None
    transactionId: str | None = None
    detectedAtDeviceMillis: int | None = None


class IngestResponse(BaseModel):
    ok: bool
    eventId: str
    receivedAt: str
    duplicate: bool = False
    duplicateOf: str | None = None


class CanonicalTransaction(BaseModel):
    eventIds: list[str]
    firstEventId: str
    firstReceivedAt: str
    latestReceivedAt: str
    duplicateCount: int
    payload: dict


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def append_event(event: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with EVENT_LOG.open("a", encoding="utf-8") as file:
        file.write(json.dumps(event, ensure_ascii=False) + "\n")


def read_recent_events(limit: int = 20) -> list[dict]:
    if not EVENT_LOG.exists():
        return []

    lines = EVENT_LOG.read_text(encoding="utf-8").splitlines()[-limit:]
    events: list[dict] = []
    for line in lines:
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            logger.warning("Skipping malformed event log line")
    return events


def read_all_events() -> list[dict]:
    if not EVENT_LOG.exists():
        return []

    events: list[dict] = []
    for line in EVENT_LOG.read_text(encoding="utf-8").splitlines():
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            logger.warning("Skipping malformed event log line")
    return events


def transaction_fingerprint(payload: NotificationPayload) -> str | None:
    if payload.amount is None or payload.direction is None:
        return None

    amount = f"{payload.amount:.2f}"
    transaction_id = (payload.transactionId or "").strip().lower()
    if transaction_id:
        return f"txn:{transaction_id}:{amount}:{payload.direction}"

    normalized_text = " ".join(payload.text.lower().split())
    if not normalized_text:
        return None

    # Fallback is intentionally conservative: same amount, direction, and first
    # chunk of normalized text. Real transaction IDs remain the primary key.
    text_bucket = normalized_text[:120]
    return f"text:{amount}:{payload.direction}:{text_bucket}"


def find_duplicate_event(payload: NotificationPayload) -> str | None:
    fingerprint = transaction_fingerprint(payload)
    if fingerprint is None and (payload.amount is None or payload.direction is None):
        return None

    for event in reversed(read_recent_events(limit=250)):
        previous_payload = event.get("payload") or {}
        try:
            previous = NotificationPayload.model_validate(previous_payload)
        except Exception:
            continue

        previous_fingerprint = transaction_fingerprint(previous)
        if fingerprint is not None and previous_fingerprint == fingerprint:
            return event.get("eventId")

        if is_near_duplicate(previous, payload):
            return event.get("eventId")

    return None


def is_near_duplicate(previous: NotificationPayload, current: NotificationPayload) -> bool:
    if previous.amount is None or current.amount is None:
        return False
    if previous.direction != current.direction:
        return False
    if round(previous.amount, 2) != round(current.amount, 2):
        return False
    if previous.deviceId and current.deviceId and previous.deviceId != current.deviceId:
        return False

    return abs(previous.timestamp - current.timestamp) <= 15_000


def resolve_duplicate_root(event: dict, events_by_id: dict[str, dict]) -> str:
    seen: set[str] = set()
    current = event

    while current.get("duplicateOf"):
        duplicate_of = current.get("duplicateOf")
        if not isinstance(duplicate_of, str) or duplicate_of in seen:
            break
        seen.add(duplicate_of)
        next_event = events_by_id.get(duplicate_of)
        if next_event is None:
            break
        current = next_event

    return str(current.get("eventId") or event.get("eventId"))


def payload_quality(payload: dict) -> int:
    score = 0
    if payload.get("transactionId"):
        score += 100
    if payload.get("merchant"):
        score += 40
    if payload.get("captureSource") == "sms_notification":
        score += 20
    if payload.get("deviceId"):
        score += 10
    if payload.get("amount") is not None:
        score += 5
    if payload.get("direction"):
        score += 5
    return score


def is_missing(value: object) -> bool:
    return value is None or value == ""


def merge_payload_group(events: list[dict]) -> dict:
    payloads = [
        event.get("payload")
        for event in events
        if isinstance(event.get("payload"), dict)
    ]
    if not payloads:
        return {}

    merged = dict(max(payloads, key=payload_quality))
    for payload in sorted(payloads, key=payload_quality, reverse=True):
        for key, value in payload.items():
            if is_missing(merged.get(key)) and not is_missing(value):
                merged[key] = value

    capture_sources = sorted(
        {
            payload.get("captureSource")
            for payload in payloads
            if payload.get("captureSource")
        }
    )
    source_apps = sorted(
        {
            payload.get("sourceApp") or payload.get("packageName")
            for payload in payloads
            if payload.get("sourceApp") or payload.get("packageName")
        }
    )

    merged["captureSources"] = capture_sources
    merged["sourceApps"] = source_apps
    return merged


def build_canonical_transactions(events: list[dict]) -> list[CanonicalTransaction]:
    events_by_id = {
        str(event.get("eventId")): event
        for event in events
        if event.get("eventId")
    }
    grouped: dict[str, list[dict]] = {}
    for event in events:
        root_id = resolve_duplicate_root(event, events_by_id)
        grouped.setdefault(root_id, []).append(event)

    transactions: list[CanonicalTransaction] = []
    for root_id, group in grouped.items():
        ordered_group = sorted(group, key=lambda event: str(event.get("receivedAt") or ""))
        event_ids = [
            str(event.get("eventId"))
            for event in ordered_group
            if event.get("eventId")
        ]
        transactions.append(
            CanonicalTransaction(
                eventIds=event_ids,
                firstEventId=root_id,
                firstReceivedAt=str(ordered_group[0].get("receivedAt") or ""),
                latestReceivedAt=str(ordered_group[-1].get("receivedAt") or ""),
                duplicateCount=max(0, len(ordered_group) - 1),
                payload=merge_payload_group(ordered_group),
            )
        )

    return sorted(transactions, key=lambda item: item.latestReceivedAt)


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "service": "pocketbuddy-test-backend",
        "logFile": str(EVENT_LOG),
        "storedEvents": len(read_recent_events(limit=10_000)),
    }


@app.post("/api/ingest/notification", response_model=IngestResponse)
def ingest_notification(payload: NotificationPayload) -> IngestResponse:
    event_id = str(uuid4())
    received_at = utc_now_iso()
    duplicate_of = find_duplicate_event(payload)
    event = {
        "eventId": event_id,
        "receivedAt": received_at,
        "duplicate": duplicate_of is not None,
        "duplicateOf": duplicate_of,
        "payload": payload.model_dump(),
    }

    append_event(event)
    logger.info(
        "notification event=%s duplicate=%s source=%s capture=%s direction=%s amount=%s merchant=%s",
        event_id,
        duplicate_of is not None,
        payload.sourceApp or payload.packageName,
        payload.captureSource,
        payload.direction,
        payload.amount,
        payload.merchant,
    )

    return IngestResponse(
        ok=True,
        eventId=event_id,
        receivedAt=received_at,
        duplicate=duplicate_of is not None,
        duplicateOf=duplicate_of,
    )


@app.get("/api/ingest/recent")
def recent_notifications(limit: int = 20) -> dict:
    safe_limit = max(1, min(limit, 100))
    return {"events": read_recent_events(limit=safe_limit)}


@app.get("/api/ingest/transactions")
def canonical_transactions(limit: int = 20) -> dict:
    safe_limit = max(1, min(limit, 100))
    transactions = build_canonical_transactions(read_all_events())
    return {"transactions": transactions[-safe_limit:]}
