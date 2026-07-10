"""Seed a realistic PocketBuddy demo account.

This script is intentionally deterministic: running it for the same account
rebuilds the same demo story with current relative dates. The builder stays
stdlib-only so tests can validate the story without requiring MongoDB or bcrypt.
Database and password dependencies are imported only by the CLI apply path.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import os
import re
import sys
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any, Iterable


DEFAULT_EMAIL = "charizardoped@gmail.com"
DEFAULT_NAME = "Nishant Harkut"
DEFAULT_CAMPUS = "ABV-IIITM Gwalior"
DEFAULT_WING = "BH-2 Wing B"
DEFAULT_ROOM = "271"
DEFAULT_ALLOWANCE_RUPEES = 12000
SEED_VERSION = "2026-07-finals-story-v3"
SEED_NAMESPACE = uuid.UUID("f2cc945a-2769-49aa-8d77-4462d81a5af6")
IST_OFFSET = dt.timedelta(minutes=330)
DEFAULT_OSRM_URL = "https://router.project-osrm.org"


COLLECTION_NAMES = [
    "users",
    "profiles",
    "transactions",
    "subscriptions",
    "candidate_subscriptions",
    "cart_pools",
    "cart_pool_items",
    "travel_routes",
    "travel_reports",
    "travel_savings",
    "travel_pools",
    "campus_food",
    "merchant_directory",
    "statement_import_batches",
    "merchant_category_mappings",
    "data_consents",
    "aa_sync_events",
    "aa_financial_snapshots",
    "companion_sync_log",
    "parser_corrections",
    "checkin_logs",
    "menu_scan_log",
    "venue_photos",
    "community_quiz_context",
    "community_quiz_votes",
    "travel_geo_cache",
]


def _coerce_now(now: dt.datetime | None) -> dt.datetime:
    if now is None:
        return dt.datetime.now(dt.timezone.utc).replace(tzinfo=None, microsecond=0)
    if now.tzinfo is not None:
        return now.astimezone(dt.timezone.utc).replace(tzinfo=None, microsecond=0)
    return now.replace(microsecond=0)


def _id(*parts: Any) -> str:
    return str(uuid.uuid5(SEED_NAMESPACE, ":".join(str(part) for part in parts)))


def _short_id(*parts: Any) -> str:
    return uuid.uuid5(SEED_NAMESPACE, ":".join(str(part) for part in parts)).hex[:12]


def _paise(rupees: float | int) -> int:
    return int(round(float(rupees) * 100))


def _rupees(paise: int | float) -> float:
    return round(float(paise) / 100, 2)


def _slug(value: str) -> str:
    clean = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return clean or "demo"


def _date_at(now: dt.datetime, days: int, hour: int = 12, minute: int = 0) -> dt.datetime:
    """Return a naive UTC timestamp for a campus-local wall-clock time."""

    local_date = (now + IST_OFFSET).date() + dt.timedelta(days=days)
    local_time = dt.datetime.combine(local_date, dt.time(hour, minute))
    return local_time - IST_OFFSET


def _local_date(now: dt.datetime) -> dt.date:
    return (now + IST_OFFSET).date()


def _date_in_month(now: dt.datetime, months_back: int, day: int, hour: int = 12, minute: int = 0) -> dt.datetime:
    local_now = now + IST_OFFSET
    year = local_now.year
    month = local_now.month - months_back
    while month <= 0:
        month += 12
        year -= 1
    last_day = _last_day(year, month)
    return dt.datetime(year, month, min(day, last_day), hour, minute) - IST_OFFSET


def _last_day(year: int, month: int) -> int:
    if month == 12:
        return 31
    return (dt.date(year, month + 1, 1) - dt.timedelta(days=1)).day


def _next_local_billing_date(now: dt.datetime, billing_day: int) -> dt.date:
    """Return the next campus-local billing date strictly after now."""

    local_now = now + IST_OFFSET
    year = local_now.year
    month = local_now.month
    candidate = dt.date(year, month, min(billing_day, _last_day(year, month)))
    if candidate <= local_now.date():
        month += 1
        if month == 13:
            month = 1
            year += 1
        candidate = dt.date(year, month, min(billing_day, _last_day(year, month)))
    return candidate


def _normalize_vendor(raw: str) -> str:
    lowered = raw.lower()
    lowered = re.sub(r"\bupi\b|\bimps\b|\bneft\b|\bpos\b|\bpaytm\b|\bgpay\b|\bphonepe\b", " ", lowered)
    lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def _normalize_geo_part(value: Any) -> str:
    if isinstance(value, float):
        return f"{value:.5f}"
    if isinstance(value, int):
        return str(value)
    text = re.sub(r"[^a-z0-9.]+", " ", str(value or "").strip().lower())
    return re.sub(r"\s+", " ", text).strip()


def _geo_cache_key(kind: str, provider: str, *parts: Any) -> str:
    normalized = [_normalize_geo_part(part) for part in parts]
    digest = hashlib.sha256("|".join(normalized).encode("utf-8")).hexdigest()[:24]
    kind_slug = _normalize_geo_part(kind).replace(" ", "_")
    provider_slug = _normalize_geo_part(provider).replace(" ", "_")
    return f"travel_geo:{kind_slug}:{provider_slug}:{digest}"


def _android_event_fields(*, needs_verification: bool = False) -> dict[str, Any]:
    return {
        "source": "companion_notification",
        "data_origin": "android_on_device",
        "privacy_mode": "on_device_only",
        "raw_payload_received": False,
        "verification_status": "needs_review" if needs_verification else "parsed_on_device",
        "parser_version": "android-v2",
        "schema_version": "2",
        "signature_verified": True,
    }


def _food_threshold(active_reviewers: int) -> int:
    return max(5, min(25, math.ceil(1.5 * math.sqrt(max(active_reviewers, 10)))))


def _travel_threshold(active_reporters: int) -> int:
    return max(5, min(25, math.ceil(1.25 * math.sqrt(max(active_reporters, 10)))))


def _tag(doc: dict[str, Any], owner_email: str) -> dict[str, Any]:
    doc.setdefault("demo_seed", True)
    doc.setdefault("seed_version", SEED_VERSION)
    doc.setdefault("seed_owner_email", owner_email)
    return doc


def _add(collections: dict[str, list[dict[str, Any]]], name: str, doc: dict[str, Any], owner_email: str) -> dict[str, Any]:
    tagged = _tag(doc, owner_email)
    collections[name].append(tagged)
    return tagged


def _txn(
    *,
    user_id: str,
    owner_email: str,
    merchant: str,
    amount_rupees: float,
    created_at: dt.datetime,
    category: str,
    direction: str = "debit",
    source: str = "manual",
    transaction_reference: str | None = None,
    parsing_confidence: str = "high",
    needs_verification: bool = False,
    raw_merchant_string: str | None = None,
    mapped_merchant_name: str | None = None,
    data_origin: str | None = None,
    privacy_mode: str = "structured_only",
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    amount = _paise(amount_rupees)
    raw = raw_merchant_string or merchant
    mapped = mapped_merchant_name or merchant
    is_android = source in {"companion_sms", "companion_notification"}
    doc: dict[str, Any] = {
        "_id": _id(owner_email, user_id, "txn", merchant, transaction_reference or created_at.isoformat(), amount, direction),
        "user_id": user_id,
        "amount": amount,
        "raw_merchant_string": raw,
        "mapped_merchant_name": mapped,
        "merchant": mapped,
        "category": category,
        "source": source,
        "is_mapped": mapped != raw or category != "other",
        "direction": direction,
        "data_origin": data_origin or ("android_on_device" if is_android else source),
        "privacy_mode": "on_device_only" if is_android else privacy_mode,
        "raw_payload_received": False,
        "verification_status": "needs_review" if needs_verification else ("parsed_on_device" if is_android else "verified"),
        "parsing_confidence": parsing_confidence,
        "needs_verification": needs_verification,
        "transaction_reference": transaction_reference or f"UTR{_short_id(user_id, merchant, created_at.isoformat())[:8].upper()}",
        "created_at": created_at,
        "updated_at": created_at,
    }
    if is_android:
        doc.update({
            "parser_version": "android-v2",
            "schema_version": "2",
            "signature_verified": True,
        })
    if extra:
        doc.update(extra)
    return _tag(doc, owner_email)


def _build_users_and_profiles(
    *,
    collections: dict[str, list[dict[str, Any]]],
    owner_email: str,
    target_user_id: str,
    email: str,
    full_name: str,
    campus: str,
    now: dt.datetime,
    monthly_allowance: int,
) -> dict[str, dict[str, str]]:
    account_slug = _slug(email.split("@", 1)[0])
    local_today = _local_date(now)
    roomies = [
        {
            "_id": target_user_id,
            "email": email,
            "full_name": full_name,
            "room_number": DEFAULT_ROOM,
            "wing_label": DEFAULT_WING,
            "phone": "+919999000271",
            "role": "target",
        },
        {
            "_id": _id(owner_email, "roommate", "aditi"),
            "email": f"aditi.demo+{account_slug}@example.com",
            "full_name": "Aditi Rao",
            "room_number": "268",
            "wing_label": DEFAULT_WING,
            "phone": "+919999000268",
            "role": "roommate",
        },
        {
            "_id": _id(owner_email, "roommate", "rohan"),
            "email": f"rohan.demo+{account_slug}@example.com",
            "full_name": "Rohan Mehta",
            "room_number": "272",
            "wing_label": DEFAULT_WING,
            "phone": "+919999000272",
            "role": "roommate",
        },
        {
            "_id": _id(owner_email, "roommate", "kanika"),
            "email": f"kanika.demo+{account_slug}@example.com",
            "full_name": "Kanika Singhal",
            "room_number": "269",
            "wing_label": DEFAULT_WING,
            "phone": "+919999000269",
            "role": "roommate",
        },
        {
            "_id": _id(owner_email, "roommate", "varun"),
            "email": f"varun.demo+{account_slug}@example.com",
            "full_name": "Varun Sharma",
            "room_number": "274",
            "wing_label": "BH-1 Wing A",
            "phone": "+919999000274",
            "role": "roommate",
        },
    ]

    for person in roomies:
        _add(
            collections,
            "users",
            {
                "_id": person["_id"],
                "email": person["email"],
                "full_name": person["full_name"],
                "phone_number": person["phone"],
                "password": "__HASHED_AT_APPLY__",
                "created_at": now - dt.timedelta(days=130),
                "updated_at": now,
                "demo_role": person["role"],
            },
            owner_email,
        )
        _add(
            collections,
            "profiles",
            {
                "_id": person["_id"],
                "user_id": person["_id"],
                "email": person["email"],
                "full_name": person["full_name"],
                "monthly_allowance": _paise(monthly_allowance if person["role"] == "target" else 9000),
                "cycle_start_day": 1,
                "college_name": campus,
                "campus": campus,
                "hostel_block": "BH-2",
                "wing_label": person["wing_label"],
                "room_number": person["room_number"],
                "phone_number": person["phone"],
                "phone": person["phone"],
                "upi_id": f"{person['full_name'].split()[0].lower()}.demo@upi",
                "onboarding_completed": True,
                "setup_completed": True,
                "residence_type": "hostel",
                "meal_routine": "hostel_mess",
                "upi_apps_used": ["googlepay", "phonepe", "amazonpay"],
                "mess_enrolled": True,
                "mess_billing_model": "monthly",
                "mess_monthly_cost": _paise(2800),
                "meal_schedule": {"breakfast": "08:30", "lunch": "13:00", "dinner": "20:30"},
                "exam_start_date": (local_today - dt.timedelta(days=1)).isoformat(),
                "exam_end_date": (local_today + dt.timedelta(days=5)).isoformat(),
                "exam_safety_buffer": _paise(900),
                "preferred_payment_apps": ["Google Pay", "PhonePe", "Amazon Pay"],
                "companion_paired": person["role"] == "target",
                "companion_sync_enabled": person["role"] == "target",
                "companion_device_id": "demo-android-pixel-7a" if person["role"] == "target" else None,
                "companion_device_name": "Nishant's Android" if person["role"] == "target" else None,
                "companion_last_sync": now - dt.timedelta(minutes=18) if person["role"] == "target" else None,
                "timezone": "Asia/Kolkata",
                "timezone_offset_minutes": 330,
                "created_at": now - dt.timedelta(days=130),
                "updated_at": now,
            },
            owner_email,
        )
    return {person["role"] if person["role"] == "target" else person["full_name"].split()[0].lower(): person for person in roomies}


def _seed_transactions(
    *,
    collections: dict[str, list[dict[str, Any]]],
    owner_email: str,
    user_id: str,
    now: dt.datetime,
    months: int,
    monthly_allowance: int,
) -> None:
    txns: list[dict[str, Any]] = []
    meal_signal_cutoff = now - dt.timedelta(hours=17, minutes=30)
    for month_index in range(months - 1, -1, -1):
        month_date = _date_in_month(now, month_index, 1, 9)
        month_label = month_date.strftime("%Y-%m")
        stipend_amount = min(2200, max(1200, int(round(monthly_allowance * 0.22))))
        home_allowance_amount = monthly_allowance - stipend_amount
        txns.append(
            _txn(
                user_id=user_id,
                owner_email=owner_email,
                merchant="Home allowance",
                amount_rupees=home_allowance_amount,
                created_at=month_date,
                category="income",
                direction="credit",
                source="allowance",
                transaction_reference=f"HOME-ALLOW-{month_label}",
            )
        )
        txns.append(
            _txn(
                user_id=user_id,
                owner_email=owner_email,
                merchant="Internship stipend",
                amount_rupees=stipend_amount,
                created_at=month_date + dt.timedelta(hours=1),
                category="income",
                direction="credit",
                source="stipend",
                transaction_reference=f"STIPEND-{month_label}",
            )
        )
        fixed = [
            ("Spotify Student", 59, 2, "subscription"),
            ("YouTube Premium", 129, 5, "subscription"),
            ("Amazon Prime Student", 149, 15, "subscription"),
        ]
        for merchant, amount, day, category in fixed:
            occurred_at = _date_in_month(now, month_index, day, 11)
            if occurred_at > now or (category == "food" and occurred_at > meal_signal_cutoff):
                continue
            txns.append(
                _txn(
                    user_id=user_id,
                    owner_email=owner_email,
                    merchant=merchant,
                    amount_rupees=amount,
                    created_at=occurred_at,
                    category=category,
                    source="companion_notification" if category == "subscription" else "manual",
                    transaction_reference=f"{_slug(merchant).upper()}-{month_label}",
                )
            )

        # Two stable occurrences are enough to surface this as an unconfirmed
        # commitment, but not enough to treat it as a confirmed subscription.
        if month_index in {0, 1}:
            occurred_at = _date_in_month(now, month_index, 1, 10)
            if occurred_at <= now:
                txns.append(
                    _txn(
                        user_id=user_id,
                        owner_email=owner_email,
                        merchant="Design Tool Workspace",
                        amount_rupees=180,
                        created_at=occurred_at,
                        category="other",
                        source="companion_notification",
                        transaction_reference=f"DESIGN-WORKSPACE-{month_label}",
                    )
                )

        recurring_food = [
            ("Campus Juice Cafe", 30, 4, 18, "food"),
            ("Campus Juice Cafe", 30, 10, 18, "food"),
            ("Campus Juice Cafe", 35, 17, 18, "food"),
            ("BH-2 Night Canteen", 85, 6, 1, "food"),
            ("Campus Store", 154, 14, 17, "stationery"),
            ("Auto to Station", 165, 21, 9, "travel"),
            ("Main Canteen", 62, 23, 13, "food"),
        ]
        for merchant, amount, day, hour, category in recurring_food:
            occurred_at = _date_in_month(now, month_index, day, hour)
            if occurred_at > now or (category == "food" and occurred_at > meal_signal_cutoff):
                continue
            txns.append(
                _txn(
                    user_id=user_id,
                    owner_email=owner_email,
                    merchant=merchant,
                    amount_rupees=amount,
                    created_at=occurred_at,
                    category=category,
                    source="companion_notification",
                    transaction_reference=f"{_slug(merchant).upper()}-{month_label}-{day}",
                )
            )

    current_pattern = [
        ("Swiggy Campus Bowl", 220, -8, 20, "food"),
        ("BH-2 Night Canteen", 70, -6, 1, "food"),
        ("Zomato Exam Dinner", 190, -5, 21, "food"),
        ("Library Cafe", 40, -5, 16, "food"),
        ("Hostel Laundry", 140, -5, 12, "other"),
        ("Campus Store", 120, -4, 17, "stationery"),
        ("Gwalior Station Auto", 140, -3, 9, "travel"),
        ("Zepto Shared Cart", 160, -2, 22, "food"),
        ("BH-2 Night Canteen", 65, -1, 1, "food"),
    ]
    for item in current_pattern:
        merchant, amount, days, hour, category = item[:5]
        direction = item[5] if len(item) > 5 else "debit"
        occurred_at = _date_at(now, days, hour)
        if occurred_at > now or (category == "food" and occurred_at > meal_signal_cutoff):
            continue
        txns.append(
            _txn(
                user_id=user_id,
                owner_email=owner_email,
                merchant=merchant,
                amount_rupees=amount,
                created_at=occurred_at,
                category=category,
                direction=direction,
                source="companion_notification",
                transaction_reference=f"UTR{157000 + abs(days) * 17 + hour}",
            )
        )

    statement_batch_id = _id(owner_email, user_id, "statement-batch", now.strftime("%Y-%m"))
    statement_rows = [
        ("UPI/CAMPUS JUICE CAFE/GWALIOR", "Campus Juice Cafe", 30, -9, "other", True),
        ("UPI/CAMPUS JUICE CAFE/GWALIOR", "Campus Juice Cafe", 30, -7, "other", True),
        ("UPI/CAMPUS JUICE CAFE/GWALIOR", "Campus Juice Cafe", 35, -5, "other", True),
        ("UPI/CAMPUS JUICE CAFE/GWALIOR", "Campus Juice Cafe", 30, -3, "other", True),
        ("UPI/CAMPUS JUICE CAFE/GWALIOR", "Campus Juice Cafe", 35, -1, "other", True),
        ("UPI/CAMPUS PHOTOCOPY/ABV", "Campus Photocopy", 42, -4, "stationery", False),
        ("UPI/RAILWAY SNACKS/GWL", "Railway Snacks", 76, -2, "food", False),
    ]
    for index, (raw, mapped, amount, days, category, needs_review) in enumerate(statement_rows, start=1):
        txns.append(
            _txn(
                user_id=user_id,
                owner_email=owner_email,
                merchant=mapped,
                raw_merchant_string=raw,
                mapped_merchant_name=mapped,
                amount_rupees=amount,
                created_at=_date_at(now, days, 18, index),
                category=category,
                source="statement_import",
                transaction_reference=f"STMT-{now:%Y%m}-{index:03d}",
                parsing_confidence="high" if needs_review else "high",
                needs_verification=False,
                data_origin="bank_statement_upload",
                privacy_mode="statement_reviewed_import",
                extra={
                    "statement_import_batch_id": statement_batch_id,
                    "statement_row_id": f"{now:%Y%m}-row-{index:03d}",
                    "statement_vendor_key": _normalize_vendor(raw),
                    "needs_category_review": needs_review,
                    "category_review_status": "pending" if needs_review else "mapped",
                    "verification_status": "user_reviewed",
                    "statement_balance_paise": _paise(7400 - index * 140),
                    "imported_at": now - dt.timedelta(hours=3),
                },
            )
        )

    txns.append(
        _txn(
            user_id=user_id,
            owner_email=owner_email,
            merchant="Unknown UPI Merchant",
            raw_merchant_string="UPI/PYMT/XX4499/QR PAY",
            amount_rupees=64,
            created_at=_date_at(now, -2, 20),
            category="other",
            source="companion_notification",
            transaction_reference="UTR-LOWCONF-64",
            parsing_confidence="low",
            needs_verification=True,
        )
    )

    collections["transactions"].extend(txns)

    _add(
        collections,
        "statement_import_batches",
        {
            "_id": statement_batch_id,
            "user_id": user_id,
            "source": "statement_import",
            "file_name": "kotak-july-statement.pdf",
            "bank_name": "Kotak Mahindra Bank",
            "account_label": "Savings XX6243",
            "raw_file_stored": False,
            "password_stored": False,
            "status": "completed",
            "created_at": now - dt.timedelta(hours=3),
            "updated_at": now - dt.timedelta(hours=2, minutes=50),
            "selected_count": len(statement_rows),
            "inserted_count": len(statement_rows),
            "duplicate_count": 0,
            "imported_transaction_ids": [txn["_id"] for txn in txns if txn.get("statement_import_batch_id") == statement_batch_id],
            "vendor_review_prompt_count": 1,
            "date_start": (_local_date(now) - dt.timedelta(days=9)).isoformat(),
            "date_end": _local_date(now).isoformat(),
            "vendor_review_prompts": [
                {
                    "vendor_key": _normalize_vendor("UPI/CAMPUS JUICE CAFE/GWALIOR"),
                    "display_name": "Campus Juice Cafe",
                    "count_this_month": 5,
                    "count_this_week": sum(1 for row in statement_rows if row[3] >= -7 and row[5]),
                    "total_amount_paise": _paise(160),
                    "suggested_category": "food",
                    "reason": "Repeated small campus payments usually represent tea, juice, snacks, or mess add-ons.",
                    "status": "pending",
                }
            ],
        },
        owner_email,
    )
    _add(
        collections,
        "merchant_category_mappings",
        {
            "_id": _id(owner_email, user_id, "mapping", "campus-photocopy"),
            "user_id": user_id,
            "source": "statement_import",
            "statement_vendor_key": _normalize_vendor("UPI/CAMPUS PHOTOCOPY/ABV"),
            "display_name": "Campus Photocopy",
            "category": "stationery",
            "match_count": 3,
            "created_at": now - dt.timedelta(days=20),
            "updated_at": now - dt.timedelta(days=4),
        },
        owner_email,
    )


def _seed_subscriptions(
    collections: dict[str, list[dict[str, Any]]],
    owner_email: str,
    user_id: str,
    now: dt.datetime,
    campus: str,
) -> None:
    subscriptions = [
        ("Spotify Student", 59, "confirmed", 96.0, 2, 4),
        ("YouTube Premium", 129, "confirmed", 93.0, 5, 4),
        ("Amazon Prime Student", 149, "confirmed", 91.0, 15, 4),
        ("Design Tool Workspace", 180, "possible", 72.0, None, 2),
    ]
    for name, amount, status, confidence, billing_day, occurrences in subscriptions:
        if billing_day is None:
            observed = [
                txn["created_at"]
                for txn in collections["transactions"]
                if txn.get("user_id") == user_id and txn.get("mapped_merchant_name") == name
            ]
            if not observed:
                raise ValueError(f"Missing recurring evidence for {name}.")
            next_debit_date = (max(observed) + dt.timedelta(days=30) + IST_OFFSET).date()
        else:
            next_debit_date = _next_local_billing_date(now, billing_day)
        evidence = (
            [
                "Seen twice at the same amount about one month apart.",
                "Kept unconfirmed until the student identifies or dismisses it.",
            ]
            if status == "possible"
            else [
                f"Seen in {occurrences} allowance cycles at a stable amount.",
                "Known subscription merchant matched to on-device Android transaction history.",
            ]
        )
        _add(
            collections,
            "subscriptions",
            {
                "_id": _id(owner_email, user_id, "subscription", name),
                "user_id": user_id,
                "service_name": name,
                "name": name,
                "amount": _paise(amount),
                "amount_paise": _paise(amount),
                "billing_cycle": "monthly",
                "next_debit_date": next_debit_date.isoformat(),
                "detected_from": "recurring_transaction_pattern" if status == "possible" else "known_service_match",
                "status": status,
                "confidence": confidence,
                "evidence": evidence,
                "occurrences_count": occurrences,
                "is_active": status in {"confirmed", "possible"},
                "last_observed_at": now - dt.timedelta(days=2),
                "observed_interval_days": 30,
                "created_at": now - dt.timedelta(days=90),
                "updated_at": now - dt.timedelta(days=1),
            },
            owner_email,
        )

    campus_key = _normalize_vendor(campus)
    for name, amount, user_count in [
        ("Campus Gym Monthly", 350, 5),
        ("Design Tool Workspace", 180, 4),
        ("Exam Prep Cloud", 299, 3),
    ]:
        _add(
            collections,
            "candidate_subscriptions",
            {
                "_id": _id(owner_email, "candidate-subscription", name),
                "canonical_name": _normalize_vendor(name),
                "campus_key": campus_key,
                "display_name": name,
                "amount": _paise(amount),
                "amount_paise": _paise(amount),
                "distinct_users": [
                    user_id,
                    *[_id(owner_email, "subscription-observer", name, index) for index in range(1, user_count)],
                ],
                "observed_interval_days": 30,
                "last_seen_at": now - dt.timedelta(days=2),
                "promoted": name == "Design Tool Workspace",
                "created_at": now - dt.timedelta(days=45),
                "updated_at": now - dt.timedelta(days=2),
            },
            owner_email,
        )


def _seed_pools(
    *,
    collections: dict[str, list[dict[str, Any]]],
    owner_email: str,
    people: dict[str, dict[str, str]],
    now: dt.datetime,
) -> None:
    target = people["target"]
    aditi = people["aditi"]
    rohan = people["rohan"]
    kanika = people["kanika"]
    varun = people["varun"]

    open_pool_id = _id(owner_email, "pool", "open-zepto-exam-snacks")
    completed_pool_id = _id(owner_email, "pool", "completed-blinkit-room-essentials")
    owed_pool_id = _id(owner_email, "pool", "aditi-hosted-photocopy")
    settled_pool_id = _id(owner_email, "pool", "settled-instamart-breakfast")
    cancelled_pool_id = _id(owner_email, "pool", "cancelled-bigbasket-monthly")

    _add(
        collections,
        "cart_pools",
        {
            "_id": open_pool_id,
            "host_id": target["_id"],
            "created_by_name": target["full_name"],
            "host_email": target["email"],
            "host_phone": target["phone"],
            "wing_label": DEFAULT_WING,
            "platform": "zepto",
            "platform_display_label": "Zepto",
            "status": "open",
            "title": "Exam-week snacks before 9 PM",
            "description": "Roommates can add small food or stationery items before the host checks out.",
            "min_cart_value": _paise(199),
            "delivery_fee": _paise(25),
            "final_overhead": 0,
            "final_discount": 0,
            "upi_id": "nishant.demo@upi",
            "requires_join_approval": True,
            "join_requests": [
                {
                    "user_id": rohan["_id"],
                    "name": rohan["full_name"],
                    "email": rohan["email"],
                    "wing_label": DEFAULT_WING,
                    "room_number": rohan["room_number"],
                    "status": "approved",
                    "requested_at": now - dt.timedelta(hours=2),
                    "decided_at": now - dt.timedelta(hours=1, minutes=45),
                    "decided_by": target["_id"],
                },
                {
                    "user_id": kanika["_id"],
                    "name": kanika["full_name"],
                    "email": kanika["email"],
                    "wing_label": DEFAULT_WING,
                    "room_number": kanika["room_number"],
                    "status": "pending",
                    "requested_at": now - dt.timedelta(minutes=35),
                },
                {
                    "user_id": varun["_id"],
                    "name": varun["full_name"],
                    "email": varun["email"],
                    "wing_label": "BH-1 Wing A",
                    "room_number": varun["room_number"],
                    "status": "rejected",
                    "requested_at": now - dt.timedelta(hours=3),
                    "decided_at": now - dt.timedelta(hours=2, minutes=50),
                    "decided_by": target["_id"],
                    "decision_reason": "Different wing for this room-only pool",
                },
            ],
            "auto_nudge_enabled": True,
            "nudge_interval_hours": 6,
            "expires_at": now + dt.timedelta(hours=36),
            "created_at": now - dt.timedelta(hours=2, minutes=20),
            "updated_at": now - dt.timedelta(minutes=20),
        },
        owner_email,
    )
    for added_by, item, price, qty in [
        (target, "Masala Maggi", 80, 1),
        (target, "Exam pens pack", 60, 1),
        (rohan, "Cold coffee", 95, 1),
        (rohan, "Dark chocolate", 45, 2),
    ]:
        _add(
            collections,
            "cart_pool_items",
            {
                "_id": _id(owner_email, open_pool_id, added_by["_id"], item),
                "pool_id": open_pool_id,
                "added_by_user_id": added_by["_id"],
                "added_by_name": added_by["full_name"],
                "item_description": item,
                "estimated_price": _paise(price * qty),
                "unit_price": _paise(price),
                "quantity": qty,
                "is_purchased": False,
                "product_url": None,
                "created_at": now - dt.timedelta(hours=1),
                "updated_at": now - dt.timedelta(minutes=20),
            },
            owner_email,
        )

    _add(
        collections,
        "cart_pools",
        {
            "_id": completed_pool_id,
            "host_id": target["_id"],
            "created_by_name": target["full_name"],
            "host_email": target["email"],
            "host_phone": target["phone"],
            "wing_label": DEFAULT_WING,
            "platform": "blinkit",
            "platform_display_label": "Blinkit",
            "status": "completed",
            "title": "Room essentials and snacks",
            "min_cart_value": _paise(299),
            "delivery_fee": _paise(20),
            "final_overhead": _paise(68),
            "final_discount": _paise(20),
            "upi_id": "nishant.demo@upi",
            "requires_join_approval": True,
            "join_requests": [],
            "payments": [
                {
                    "user_id": rohan["_id"],
                    "name": rohan["full_name"],
                    "utr": "653029277807",
                    "status": "verified",
                    "expected_amount": _paise(132),
                    "amount_tolerance": _paise(2),
                    "confidence": "high",
                    "verification_source": "auto_host_credit",
                    "submitted_at": (now - dt.timedelta(hours=14)).isoformat(),
                    "verified_at": (now - dt.timedelta(hours=13, minutes=55)).isoformat(),
                },
                {
                    "user_id": kanika["_id"],
                    "name": kanika["full_name"],
                    "utr": "927780112348",
                    "status": "pending",
                    "expected_amount": _paise(89),
                    "amount_tolerance": _paise(2),
                    "confidence": "medium",
                    "verification_source": "manual_utr",
                    "submitted_at": (now - dt.timedelta(hours=3)).isoformat(),
                },
                {
                    "user_id": aditi["_id"],
                    "name": aditi["full_name"],
                    "utr": "927780112349",
                    "status": "needs_review",
                    "expected_amount": _paise(89),
                    "amount_tolerance": _paise(2),
                    "confidence": "low",
                    "verification_source": "auto_host_credit",
                    "review_reason": "Same amount appeared in two recent pools",
                    "submitted_at": (now - dt.timedelta(hours=2)).isoformat(),
                },
            ],
            "expires_at": now - dt.timedelta(hours=18),
            "completed_at": now - dt.timedelta(hours=16),
            "created_at": now - dt.timedelta(days=2, hours=2),
            "updated_at": now - dt.timedelta(hours=2),
        },
        owner_email,
    )
    for added_by, item, price in [
        (target, "Toothpaste", 90),
        (rohan, "Notebook and pens", 120),
        (kanika, "Peanut butter sachets", 77),
        (aditi, "Paper cups", 77),
    ]:
        _add(
            collections,
            "cart_pool_items",
            {
                "_id": _id(owner_email, completed_pool_id, added_by["_id"], item),
                "pool_id": completed_pool_id,
                "added_by_user_id": added_by["_id"],
                "added_by_name": added_by["full_name"],
                "item_description": item,
                "estimated_price": _paise(price),
                "unit_price": _paise(price),
                "quantity": 1,
                "is_purchased": True,
                "created_at": now - dt.timedelta(days=2),
                "updated_at": now - dt.timedelta(hours=16),
            },
            owner_email,
        )

    _add(
        collections,
        "cart_pools",
        {
            "_id": owed_pool_id,
            "host_id": aditi["_id"],
            "created_by_name": aditi["full_name"],
            "host_email": aditi["email"],
            "host_phone": aditi["phone"],
            "wing_label": DEFAULT_WING,
            "platform": "amazon",
            "platform_display_label": "Amazon",
            "status": "completed",
            "title": "Photocopy bundle for minor exam",
            "delivery_fee": _paise(0),
            "final_overhead": 0,
            "final_discount": 0,
            "upi_id": "aditi.demo@upi",
            "payments": [
                {
                    "user_id": target["_id"],
                    "name": target["full_name"],
                    "utr": None,
                    "status": "pending",
                    "expected_amount": _paise(126),
                    "amount_tolerance": _paise(2),
                    "confidence": "pending",
                    "verification_source": "awaiting_payment",
                    "submitted_at": None,
                }
            ],
            "expires_at": now - dt.timedelta(hours=11),
            "completed_at": now - dt.timedelta(hours=10),
            "created_at": now - dt.timedelta(days=1, hours=3),
            "updated_at": now - dt.timedelta(hours=10),
        },
        owner_email,
    )
    _add(
        collections,
        "cart_pool_items",
        {
            "_id": _id(owner_email, owed_pool_id, target["_id"], "Minor exam photocopy"),
            "pool_id": owed_pool_id,
            "added_by_user_id": target["_id"],
            "added_by_name": target["full_name"],
            "item_description": "Minor exam photocopy",
            "estimated_price": _paise(126),
            "unit_price": _paise(126),
            "quantity": 1,
            "is_purchased": True,
            "created_at": now - dt.timedelta(days=1, hours=2),
            "updated_at": now - dt.timedelta(hours=10),
        },
            owner_email,
        )

    _add(
        collections,
        "cart_pools",
        {
            "_id": settled_pool_id,
            "host_id": target["_id"],
            "created_by_name": target["full_name"],
            "host_email": target["email"],
            "host_phone": target["phone"],
            "wing_label": DEFAULT_WING,
            "platform": "swiggy_instamart",
            "platform_display_label": "Swiggy Instamart",
            "status": "completed",
            "title": "Breakfast basics after lab",
            "description": "A small morning pool that is fully paid and safe to show as history.",
            "min_cart_value": _paise(199),
            "delivery_fee": _paise(20),
            "final_overhead": _paise(28),
            "final_discount": _paise(10),
            "upi_id": "nishant.demo@upi",
            "requires_join_approval": True,
            "join_requests": [
                {
                    "user_id": rohan["_id"],
                    "name": rohan["full_name"],
                    "email": rohan["email"],
                    "wing_label": DEFAULT_WING,
                    "room_number": rohan["room_number"],
                    "status": "approved",
                    "requested_at": now - dt.timedelta(days=5, hours=2),
                    "decided_at": now - dt.timedelta(days=5, hours=1, minutes=55),
                    "decided_by": target["_id"],
                }
            ],
            "payments": [
                {
                    "user_id": rohan["_id"],
                    "name": rohan["full_name"],
                    "utr": "821730445612",
                    "status": "verified",
                    "expected_amount": _paise(74),
                    "amount_tolerance": _paise(2),
                    "confidence": "high",
                    "verification_source": "auto_host_credit",
                    "submitted_at": (now - dt.timedelta(days=5, hours=1)).isoformat(),
                    "verified_at": (now - dt.timedelta(days=5, minutes=50)).isoformat(),
                },
                {
                    "user_id": kanika["_id"],
                    "name": kanika["full_name"],
                    "utr": "821730445613",
                    "status": "verified",
                    "expected_amount": _paise(66),
                    "amount_tolerance": _paise(2),
                    "confidence": "high",
                    "verification_source": "auto_host_credit",
                    "submitted_at": (now - dt.timedelta(days=5, minutes=45)).isoformat(),
                    "verified_at": (now - dt.timedelta(days=5, minutes=42)).isoformat(),
                },
            ],
            "expires_at": now - dt.timedelta(days=5),
            "completed_at": now - dt.timedelta(days=5, minutes=40),
            "created_at": now - dt.timedelta(days=5, hours=3),
            "updated_at": now - dt.timedelta(days=5, minutes=40),
        },
        owner_email,
    )
    for added_by, item, price in [
        (target, "Milk tetra pack", 70),
        (rohan, "Bread loaf", 74),
        (kanika, "Bananas", 66),
    ]:
        _add(
            collections,
            "cart_pool_items",
            {
                "_id": _id(owner_email, settled_pool_id, added_by["_id"], item),
                "pool_id": settled_pool_id,
                "added_by_user_id": added_by["_id"],
                "added_by_name": added_by["full_name"],
                "item_description": item,
                "estimated_price": _paise(price),
                "unit_price": _paise(price),
                "quantity": 1,
                "is_purchased": True,
                "created_at": now - dt.timedelta(days=5, hours=2),
                "updated_at": now - dt.timedelta(days=5, minutes=45),
            },
            owner_email,
        )

    _add(
        collections,
        "cart_pools",
        {
            "_id": cancelled_pool_id,
            "host_id": target["_id"],
            "created_by_name": target["full_name"],
            "host_email": target["email"],
            "host_phone": target["phone"],
            "wing_label": DEFAULT_WING,
            "platform": "bigbasket",
            "platform_display_label": "BigBasket",
            "status": "cancelled",
            "title": "Monthly pantry restock",
            "description": "Cancelled because the delivery slot moved past hostel gate timing.",
            "min_cart_value": _paise(499),
            "delivery_fee": _paise(0),
            "final_overhead": 0,
            "final_discount": 0,
            "upi_id": "nishant.demo@upi",
            "requires_join_approval": True,
            "join_requests": [
                {
                    "user_id": rohan["_id"],
                    "name": rohan["full_name"],
                    "email": rohan["email"],
                    "wing_label": DEFAULT_WING,
                    "room_number": rohan["room_number"],
                    "status": "approved",
                    "requested_at": now - dt.timedelta(days=3, hours=4),
                    "decided_at": now - dt.timedelta(days=3, hours=3, minutes=45),
                    "decided_by": target["_id"],
                }
            ],
            "payments": [],
            "expires_at": now - dt.timedelta(days=3, hours=1),
            "cancelled_at": now - dt.timedelta(days=3),
            "cancellation_reason": "Delivery slot shifted after hostel gate timing.",
            "created_at": now - dt.timedelta(days=3, hours=5),
            "updated_at": now - dt.timedelta(days=3),
        },
        owner_email,
    )
    for added_by, item, price in [
        (target, "Laundry detergent", 210),
        (rohan, "Oats pouch", 165),
    ]:
        _add(
            collections,
            "cart_pool_items",
            {
                "_id": _id(owner_email, cancelled_pool_id, added_by["_id"], item),
                "pool_id": cancelled_pool_id,
                "added_by_user_id": added_by["_id"],
                "added_by_name": added_by["full_name"],
                "item_description": item,
                "estimated_price": _paise(price),
                "unit_price": _paise(price),
                "quantity": 1,
                "is_purchased": False,
                "cart_status": "skipped",
                "cart_status_reason": "Pool cancelled before checkout.",
                "created_at": now - dt.timedelta(days=3, hours=4),
                "updated_at": now - dt.timedelta(days=3),
            },
            owner_email,
        )


def _seed_travel(
    *,
    collections: dict[str, list[dict[str, Any]]],
    owner_email: str,
    user_id: str,
    people: dict[str, dict[str, str]],
    now: dt.datetime,
    campus: str,
) -> None:
    route_id = _id(owner_email, "travel-route", "gwalior-station-main-gate")
    geometry = [
        [26.2154, 78.1826],
        [26.2181, 78.1813],
        [26.2242, 78.1799],
        [26.2314, 78.1777],
        [26.2392, 78.1756],
        [26.2491, 78.1748],
    ]
    modes = [
        {"mode": "Auto", "min_fare": 150, "max_fare": 170, "median_fare": 159, "report_sample_size": 6, "report_threshold": 5, "fare_source": "student_reports", "fare_source_label": "Student reports"},
        {"mode": "Bike", "min_fare": 61, "max_fare": 83, "median_fare": 72, "report_sample_size": 1, "report_threshold": 5, "fare_source": "distance_model", "fare_source_label": "Distance model"},
        {"mode": "Cab", "min_fare": 264, "max_fare": 354, "median_fare": 306, "report_sample_size": 0, "report_threshold": 5, "fare_source": "distance_model", "fare_source_label": "Distance model"},
        {"mode": "Shared", "min_fare": 31, "max_fare": 50, "median_fare": 42, "report_sample_size": 1, "report_threshold": 5, "fare_source": "distance_model", "fare_source_label": "Distance model"},
    ]
    _add(
        collections,
        "travel_routes",
        {
            "_id": route_id,
            "id": route_id,
            "college": campus,
            "campus": campus,
            "name": "Gwalior Station to ABV-IIITM Gwalior Main Gate",
            "description": "Mapped station-to-campus route with a community-backed auto fare band.",
            "from_label": "Gwalior Station",
            "to_label": "ABV-IIITM Gwalior Main Gate",
            "from": "Gwalior Station",
            "to": "ABV-IIITM Gwalior Main Gate",
            "origin": {"lat": 26.2154, "lng": 78.1826},
            "destination": {"lat": 26.2491, "lng": 78.1748},
            "distance_km": 6.1,
            "duration_mins": 18,
            "route_source": "osrm_cached",
            "geometry": geometry,
            "modes": modes,
            "trust": {
                "active_reporters": 12,
                "verification_threshold": _travel_threshold(12),
                "trusted_modes": ["auto", "bike", "shared"],
                "last_report_at": now - dt.timedelta(hours=4),
            },
            "created_at": now - dt.timedelta(days=80),
            "updated_at": now - dt.timedelta(hours=4),
        },
        owner_email,
    )
    _add(
        collections,
        "travel_geo_cache",
        {
            "_id": _geo_cache_key(
                "osrm_route",
                DEFAULT_OSRM_URL,
                26.2154,
                78.1826,
                26.2491,
                78.1748,
            ),
            "kind": "osrm_route",
            "provider": DEFAULT_OSRM_URL,
            "payload": {
                "distance_km": 6.1,
                "duration_mins": 18,
                "geometry": geometry,
            },
            "created_at": now - dt.timedelta(hours=4),
            "expires_at": now + dt.timedelta(days=7),
        },
        owner_email,
    )
    reporters = [people["target"], people["aditi"], people["rohan"], people["kanika"], people["varun"]]
    reports = [
        ("auto", 155, -6, "morning", people["target"]),
        ("auto", 160, -5, "evening", people["aditi"]),
        ("auto", 150, -4, "afternoon", people["rohan"]),
        ("auto", 170, -3, "night", people["kanika"]),
        ("auto", 158, -2, "morning", people["varun"]),
        ("auto", 162, -1, "evening", people["target"]),
        ("bike", 72, -1, "morning", people["rohan"]),
        ("shared", 42, -2, "evening", people["aditi"]),
    ]
    for mode, amount, days, time_of_day, reporter in reports:
        _add(
            collections,
            "travel_reports",
            {
                "_id": _id(owner_email, route_id, "report", mode, amount, days, reporter["_id"]),
                "user_id": reporter["_id"],
                "reporter_id": reporter["_id"],
                "route_id": route_id,
                "campus": campus,
                "mode": mode,
                "amount_paid": amount,
                "driver_quote": amount + 20 if mode == "auto" else amount,
                "final_amount": amount,
                "time_of_day": time_of_day,
                "luggage": mode == "auto" and amount >= 170,
                "anonymous": reporter["_id"] != user_id,
                "upvotes": [
                    voter["_id"]
                    for voter in reporters
                    if voter["_id"] != reporter["_id"]
                ][:2],
                "downvotes": [],
                "is_disputed": False,
                "created_at": now + dt.timedelta(days=days),
                "updated_at": now + dt.timedelta(days=days),
            },
            owner_email,
        )
    _add(
        collections,
        "travel_savings",
        {
            "_id": _id(owner_email, user_id, "travel-saving", route_id),
            "user_id": user_id,
            "route_id": route_id,
            "mode": "auto",
            "quoted_amount": 240,
            "paid_amount": 160,
            "amount_saved": 80,
            "campus": campus,
            "created_at": now - dt.timedelta(days=1),
        },
        owner_email,
    )
    _add(
        collections,
        "travel_pools",
        {
            "_id": _id(owner_email, "travel-pool", "station-evening"),
            "host_id": user_id,
            "route_id": route_id,
            "college": campus,
            "departure_time": (now + dt.timedelta(hours=30)).isoformat(),
            "mode": "Auto",
            "max_passengers": 3,
            "description": "Share an auto from Gwalior Station after the evening train.",
            "host_name": people["target"]["full_name"],
            "host_phone": people["target"]["phone"],
            "host_wing": DEFAULT_WING,
            "status": "active",
            "safety_context": {
                "can_create": True,
                "blocking_reason": None,
                "notes": ["Same-campus ride pool.", "Host identity is visible to joined students.", f"Host wing: {DEFAULT_WING}."],
                "scope": "same_campus",
                "host_contact_verified": True,
                "late_night": False,
                "max_passengers": 3,
            },
            "co_passengers": [
                {"user_id": user_id, "full_name": people["target"]["full_name"], "wing_label": DEFAULT_WING},
                {"user_id": people["rohan"]["_id"], "full_name": people["rohan"]["full_name"], "wing_label": DEFAULT_WING},
            ],
            "created_at": now - dt.timedelta(hours=1),
            "updated_at": now - dt.timedelta(minutes=20),
        },
        owner_email,
    )


def _seed_food(
    *,
    collections: dict[str, list[dict[str, Any]]],
    owner_email: str,
    user_id: str,
    people: dict[str, dict[str, str]],
    now: dt.datetime,
    campus: str,
) -> None:
    reviewers = 14
    threshold = _food_threshold(reviewers)
    community_people = [people["target"], people["aditi"], people["rohan"], people["kanika"], people["varun"]]

    # These rows intentionally meet the same privacy gates used by /signals:
    # at least five matching payments from at least three independent users.
    for index in range(5):
        person = community_people[index % len(community_people)]
        collections["transactions"].append(
            _txn(
                user_id=person["_id"],
                owner_email=owner_email,
                merchant="Kiosk 27",
                raw_merchant_string="UPI/KIOSK-27/BH2",
                mapped_merchant_name="Kiosk 27",
                amount_rupees=10 + index,
                created_at=_date_at(now, -10 + index, 16, index),
                category="other",
                source="companion_notification",
                transaction_reference=f"COMMUNITY-CATEGORY-{index + 1}",
            )
        )
        collections["transactions"].append(
            _txn(
                user_id=person["_id"],
                owner_email=owner_email,
                merchant="BH-2 Night Canteen",
                amount_rupees=42,
                created_at=_date_at(now, -10 + index, 20, index),
                category="food",
                source="companion_notification",
                transaction_reference=f"COMMUNITY-ITEM-{index + 1}",
            )
        )

    active_items = [
        ("bh2-night-canteen", "BH-2 Night Canteen", "Masala Maggi", "food", 40, "20:00", "02:00"),
        ("bh2-night-canteen", "BH-2 Night Canteen", "Egg Paratha", "food", 45, "20:00", "02:00"),
        ("bh2-night-canteen", "BH-2 Night Canteen", "Tea", "beverage", 10, "20:00", "02:00"),
        ("main-canteen", "Main Canteen", "Rajma Rice", "food", 60, "12:00", "16:00"),
        ("main-canteen", "Main Canteen", "Veg Thali", "food", 70, "12:00", "15:00"),
        ("library-cafe", "Library Cafe", "Samosa", "snack", 15, "10:00", "19:00"),
        ("campus-juice-center", "Campus Juice Center", "Banana Shake", "beverage", 35, "09:00", "21:30"),
    ]
    for venue_id, venue_name, item_name, category, price, start, end in active_items:
        _add(
            collections,
            "campus_food",
            {
                "_id": _id(owner_email, "food", venue_id, item_name),
                "id": f"{venue_id}-{_slug(item_name)}",
                "campus": campus,
                "venue_id": venue_id,
                "venue_name": venue_name,
                "item_name": item_name,
                "category": category,
                "price": _paise(price),
                "available_from": start,
                "available_until": end,
                "status": "active",
                "source": "community_item_quiz",
                "verification_votes": threshold + 3,
                "confirmation_count": threshold + 1,
                "dispute_count": 0,
                "verification_threshold": threshold,
                "active_reviewers": reviewers,
                "voters": [_id(owner_email, "food-reviewer", index) for index in range(threshold + 1)],
                "created_at": now - dt.timedelta(days=18),
                "updated_at": now - dt.timedelta(days=1),
            },
            owner_email,
        )
    pending_item_id = _id(owner_email, "food", "scan", "butter-paneer-maggi")
    _add(
        collections,
        "campus_food",
        {
            "_id": pending_item_id,
            "id": "bh2-night-canteen-butter-paneer-maggi",
            "campus": campus,
            "venue_id": "bh2-night-canteen",
            "venue_name": "BH-2 Night Canteen",
            "item_name": "Butter Paneer Maggi",
            "category": "food",
            "price": _paise(80),
            "available_from": "20:00",
            "available_until": "02:00",
            "status": "pending_verification",
            "source": "demo_menu_scan",
            "verification_votes": threshold - 1,
            "confirmation_count": threshold - 1,
            "dispute_count": 0,
            "verification_threshold": threshold,
            "active_reviewers": reviewers,
            "voters": [_id(owner_email, "food-reviewer", index) for index in range(threshold - 1)],
            "scanned_by": user_id,
            "needs_review": True,
            "created_at": now - dt.timedelta(hours=4),
            "updated_at": now - dt.timedelta(hours=1),
        },
        owner_email,
    )
    _add(
        collections,
        "campus_food",
        {
            "_id": _id(owner_email, "food", "disputed", "cold-coffee-price"),
            "id": "library-cafe-cold-coffee-price-candidate",
            "campus": campus,
            "venue_id": "library-cafe",
            "venue_name": "Library Cafe",
            "item_name": "Cold Coffee",
            "category": "beverage",
            "price": _paise(75),
            "status": "disputed_hidden",
            "source": "price_spike_quiz",
            "verification_votes": 2,
            "confirmation_count": 2,
            "dispute_count": 5,
            "verification_threshold": threshold,
            "active_reviewers": reviewers,
            "needs_review": True,
            "review_reason": "Price jump disputed by multiple students",
            "created_at": now - dt.timedelta(days=2),
            "updated_at": now - dt.timedelta(hours=6),
        },
        owner_email,
    )


def _seed_privacy_and_sync(
    *,
    collections: dict[str, list[dict[str, Any]]],
    owner_email: str,
    user_id: str,
    now: dt.datetime,
    campus: str,
) -> None:
    android_consent_id = _id(owner_email, user_id, "android-consent-history")
    aa_consent_id = _id(owner_email, user_id, "aa-consent-active")
    selected_accounts = [
        {
            "account_ref": "AA-SBX-KOTAK-PRIMARY-6243",
            "masked_account_ref": "XXXX6243",
            "account_type": "Savings account",
            "fi_type": "DEPOSIT",
            "nickname": "Primary savings",
        },
        {
            "account_ref": "AA-SBX-KOTAK-SPENDING-9012",
            "masked_account_ref": "XXXX9012",
            "account_type": "Savings account",
            "fi_type": "DEPOSIT",
            "nickname": "Campus spending",
        },
    ]
    aa_records = [
        {
            "posted_at": (now - dt.timedelta(days=3)).isoformat() + "Z",
            "direction": "DEBIT",
            "amount_paise": _paise(72),
            "merchant": "Campus Canteen",
            "transaction_reference": "AA-SBX-DEMO-0101",
            "masked_account_ref": "XXXX6243",
            "account_ref": "AA-SBX-KOTAK-PRIMARY-6243",
            "account_type": "Savings account",
        },
        {
            "posted_at": (now - dt.timedelta(days=2)).isoformat() + "Z",
            "direction": "DEBIT",
            "amount_paise": _paise(125),
            "merchant": "Metro Card Recharge",
            "transaction_reference": "AA-SBX-DEMO-0102",
            "masked_account_ref": "XXXX6243",
            "account_ref": "AA-SBX-KOTAK-PRIMARY-6243",
            "account_type": "Savings account",
        },
        {
            "posted_at": (now - dt.timedelta(days=1)).isoformat() + "Z",
            "direction": "CREDIT",
            "amount_paise": _paise(2500),
            "merchant": "Allowance Credit",
            "transaction_reference": "AA-SBX-DEMO-0103",
            "masked_account_ref": "XXXX6243",
            "account_ref": "AA-SBX-KOTAK-PRIMARY-6243",
            "account_type": "Savings account",
        },
        {
            "posted_at": (now - dt.timedelta(days=3)).isoformat() + "Z",
            "direction": "DEBIT",
            "amount_paise": _paise(42),
            "merchant": "Library Print Counter",
            "transaction_reference": "AA-SBX-DEMO-0201",
            "masked_account_ref": "XXXX9012",
            "account_ref": "AA-SBX-KOTAK-SPENDING-9012",
            "account_type": "Savings account",
        },
        {
            "posted_at": (now - dt.timedelta(days=2)).isoformat() + "Z",
            "direction": "DEBIT",
            "amount_paise": _paise(98),
            "merchant": "Hostel Mess Top-up",
            "transaction_reference": "AA-SBX-DEMO-0202",
            "masked_account_ref": "XXXX9012",
            "account_ref": "AA-SBX-KOTAK-SPENDING-9012",
            "account_type": "Savings account",
        },
        {
            "posted_at": (now - dt.timedelta(days=1)).isoformat() + "Z",
            "direction": "DEBIT",
            "amount_paise": _paise(60),
            "merchant": "UPI Transfer",
            "transaction_reference": "AA-SBX-DEMO-0203",
            "masked_account_ref": "XXXX9012",
            "account_ref": "AA-SBX-KOTAK-SPENDING-9012",
            "account_type": "Savings account",
        },
    ]
    for consent in [
        {
            "_id": aa_consent_id,
            "user_id": user_id,
            "source": "account_aggregator",
            "status": "active",
            "provider": "local_sandbox",
            "provider_label": "Kotak Mahindra Bank Sandbox",
            "financial_institution_code": "kotak",
            "financial_institution_name": "Kotak Mahindra Bank",
            "financial_institution_short_name": "KOTAK",
            "trust_framework": "RBI Account Aggregator",
            "aa_status": "ACTIVE",
            "purpose": "Preview bank-consent controls for PocketBuddy insights",
            "data_categories": [
                "deposit_account_transactions",
                "transaction_amount",
                "transaction_timestamp",
                "transaction_reference",
                "masked_account_reference",
            ],
            "fi_types": ["DEPOSIT"],
            "requested_range_days": 30,
            "selected_accounts": selected_accounts,
            "account_count": len(selected_accounts),
            "masked_account_refs": [account["masked_account_ref"] for account in selected_accounts],
            "fetch_status": "completed",
            "fetched_records_count": len(aa_records),
            "uses_sandbox_data": True,
            "raw_text_policy": "not_applicable_encrypted_fi",
            "created_at": now - dt.timedelta(days=3),
            "updated_at": now - dt.timedelta(hours=2),
            "last_used_at": now - dt.timedelta(hours=2),
            "last_fetch_at": now - dt.timedelta(hours=2),
            "last_sync_at": now - dt.timedelta(hours=2),
            "expires_at": now + dt.timedelta(days=27),
        },
        {
            "_id": android_consent_id,
            "user_id": user_id,
            "source": "android_connector",
            "status": "active",
            "device_id": "demo-android-pixel-7a",
            "device_name": "Nishant's Android",
            "purpose": "instant_payment_tracking",
            "data_categories": ["amount", "merchant", "direction", "transaction_reference", "source_app", "masked_preview"],
            "raw_text_policy": "not_required_for_v2",
            "created_at": now - dt.timedelta(days=21),
            "granted_at": now - dt.timedelta(days=21),
            "updated_at": now - dt.timedelta(minutes=18),
            "last_sync_at": now - dt.timedelta(minutes=18),
        },
        {
            "_id": _id(owner_email, user_id, "aa-consent-revoked"),
            "user_id": user_id,
            "source": "account_aggregator",
            "status": "revoked",
            "provider": "local_sandbox",
            "provider_label": "State Bank of India Sandbox",
            "financial_institution_code": "sbi",
            "financial_institution_name": "State Bank of India",
            "financial_institution_short_name": "SBI",
            "purpose": "Preview bank-consent controls for PocketBuddy insights",
            "data_categories": ["deposit_account_transactions", "transaction_amount", "transaction_timestamp"],
            "selected_accounts": [
                {
                    "account_ref": "AA-SBX-SBI-PRIMARY-1111",
                    "masked_account_ref": "XXXX1111",
                    "account_type": "Savings account",
                    "fi_type": "DEPOSIT",
                    "nickname": "Old sandbox consent",
                }
            ],
            "account_count": 1,
            "masked_account_refs": ["XXXX1111"],
            "fetch_status": "revoked",
            "fetched_records_count": 0,
            "uses_sandbox_data": True,
            "created_at": now - dt.timedelta(days=25),
            "updated_at": now - dt.timedelta(days=11),
            "revoked_at": now - dt.timedelta(days=11),
        },
    ]:
        _add(collections, "data_consents", consent, owner_email)

    _add(
        collections,
        "aa_sync_events",
        {
            "_id": _id(owner_email, user_id, "aa-sync", _local_date(now)),
            "user_id": user_id,
            "consent_id": aa_consent_id,
            "source": "account_aggregator",
            "event_type": "fi_fetch_completed",
            "status": "completed",
            "uses_sandbox_data": True,
            "message": "AA sandbox financial information fetched. Sandbox records were not inserted as live transactions.",
            "metadata": {"record_count": len(aa_records), "sandbox_data": True},
            "created_at": now - dt.timedelta(hours=2),
            "completed_at": now - dt.timedelta(hours=1, minutes=58),
        },
        owner_email,
    )
    _add(
        collections,
        "aa_financial_snapshots",
        {
            "_id": _id(owner_email, user_id, "aa-snapshot", _local_date(now)),
            "user_id": user_id,
            "consent_id": aa_consent_id,
            "source": "account_aggregator",
            "provider": "local_sandbox",
            "sandbox_data": True,
            "accounts": selected_accounts,
            "account_count": len(selected_accounts),
            "record_count": len(aa_records),
            "records": aa_records,
            "created_at": now - dt.timedelta(hours=2),
        },
        owner_email,
    )

    sync_logs = [
        ("sms_notification", "parsed", 154, "Campus Store", "UTR154", "Sent Rs.154 from XX6243 to Campus Store. UPI ref no. UTR154.", -4, 17),
        ("sms_notification", "pool_payment_verified", 132, "Rohan Mehta", "653029277807", "Received Rs.132 from Rohan in your account. UPI ref no. 653029277807.", -1, 21),
        ("payment_app", "duplicate", 154, "Campus Store", "UTR154", "Rs.154 sent via UPI. Amount debited from XX6243.", -4, 17),
        ("sms_notification", "pool_payment_review", 89, "Kanika Singhal", "927780112348", "Received Rs.89 from Kanika. UPI ref no. 927780112348.", -1, 23),
        ("sms_notification", "incomplete", None, None, None, "Paid via QR. Details hidden by bank notification format.", -2, 20),
    ]
    for index, (source, status, amount, merchant, ref, preview, days, hour) in enumerate(sync_logs, start=1):
        masked_preview = re.sub(r"\d", "X", preview)
        _add(
            collections,
            "companion_sync_log",
            {
                "_id": _id(owner_email, user_id, "sync-log", index),
                "user_id": user_id,
                "device_id": "demo-android-pixel-7a",
                "device_name": "Nishant's Android",
                "notification_source": source,
                "processing_status": status,
                "parsed_amount": amount,
                "parsed_merchant": merchant,
                "transaction_reference": ref,
                "notification_preview": masked_preview,
                "masked_preview": masked_preview,
                "data_origin": "android_on_device",
                "privacy_mode": "on_device_only",
                "raw_payload_received": False,
                "parser_version": "android-v2",
                "schema_version": "2",
                "signature_verified": True,
                "source_confidence": "high" if status not in {"incomplete", "pool_payment_review"} else "medium",
                "package_name": "com.google.android.apps.nbu.paisa.user" if source == "payment_app" else "android.provider.Telephony.SMS_RECEIVED",
                "source_app": "Google Pay" if source == "payment_app" else "SMS",
                "client_event_id": f"demo-event-{index}",
                "created_at": _date_at(now, days, hour),
            },
            owner_email,
        )

    _add(
        collections,
        "parser_corrections",
        {
            "_id": _id(owner_email, user_id, "parser-correction", "qr-pay"),
            "user_id": user_id,
            "source": "review_inbox",
            "masked_original_text": "Paid Rs.XX via QR. Ref XXXXXXXX.",
            "corrected_merchant": "BH-2 Night Canteen",
            "corrected_amount": _paise(64),
            "corrected_category": "food",
            "parser_confidence_before": "low",
            "created_at": now - dt.timedelta(days=1),
        },
        owner_email,
    )
    _add(
        collections,
        "checkin_logs",
        {
            "_id": _id(owner_email, user_id, "checkin", "mess-dinner"),
            "user_id": user_id,
            "type": "meal_checkin",
            "status": "completed",
            "response": "meal_logged",
            "meal": "dinner",
            "meal_source": "mess",
            "is_meal_signal": True,
            "food_gap_hours": 8.5,
            "gap_hours": 8.5,
            "campus": campus,
            "created_at": now - dt.timedelta(hours=17, minutes=30),
        },
        owner_email,
    )
    _add(
        collections,
        "checkin_logs",
        {
            "_id": _id(owner_email, user_id, "checkin", "exam-stress"),
            "user_id": user_id,
            "type": "exam_window",
            "status": "acknowledged",
            "response": "use_mess_backup",
            "created_at": now - dt.timedelta(days=1, hours=2),
        },
        owner_email,
    )


def _seed_merchant_directory(
    collections: dict[str, list[dict[str, Any]]],
    owner_email: str,
    now: dt.datetime,
    campus: str,
) -> None:
    merchants = [
        ("Campus Juice Cafe", "food", True, -1),
        ("BH-2 Night Canteen", "food", True, -1),
        ("Campus Store", "stationery", True, -4),
        ("Campus Photocopy", "stationery", True, -4),
        ("Gwalior Station Auto", "travel", True, -3),
        ("Unknown UPI Merchant", "other", False, -2),
    ]
    for raw, category, verified, days in merchants:
        _add(
            collections,
            "merchant_directory",
            {
                "_id": _id(owner_email, "merchant", raw),
                "raw_string": raw,
                "display_name": raw,
                "category": category,
                "verified": verified,
                "campus": campus,
                "updated_by": "community" if verified else "review_inbox",
                "usage_count": 9 if raw == "Campus Juice Cafe" else 3,
                "created_at": now - dt.timedelta(days=60),
                "updated_at": now + dt.timedelta(days=days),
            },
            owner_email,
        )


def build_demo_seed_payload(
    *,
    now: dt.datetime | None = None,
    email: str = DEFAULT_EMAIL,
    full_name: str = DEFAULT_NAME,
    campus: str = DEFAULT_CAMPUS,
    monthly_allowance: int = DEFAULT_ALLOWANCE_RUPEES,
    months: int = 4,
    user_id: str | None = None,
) -> dict[str, Any]:
    """Build a complete demo seed payload without touching external services."""

    now = _coerce_now(now)
    email = email.strip().lower()
    campus = campus.strip()
    full_name = full_name.strip() or DEFAULT_NAME
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ValueError("Enter a valid target account email.")
    if campus.casefold() != DEFAULT_CAMPUS.casefold():
        raise ValueError(f"This finals demo scenario supports {DEFAULT_CAMPUS} only.")
    if monthly_allowance <= 0:
        raise ValueError("Monthly allowance must be greater than zero.")
    months = int(months)
    if not 3 <= months <= 12:
        raise ValueError("Seed between 3 and 12 months so recurring patterns remain credible.")
    target_user_id = user_id or _id("demo-user", email)

    collections: dict[str, list[dict[str, Any]]] = {name: [] for name in COLLECTION_NAMES}
    people = _build_users_and_profiles(
        collections=collections,
        owner_email=email,
        target_user_id=target_user_id,
        email=email,
        full_name=full_name,
        campus=campus,
        now=now,
        monthly_allowance=monthly_allowance,
    )
    _seed_transactions(
        collections=collections,
        owner_email=email,
        user_id=target_user_id,
        now=now,
        months=months,
        monthly_allowance=monthly_allowance,
    )
    _seed_subscriptions(collections, email, target_user_id, now, campus)
    _seed_pools(collections=collections, owner_email=email, people=people, now=now)
    _seed_travel(collections=collections, owner_email=email, user_id=target_user_id, people=people, now=now, campus=campus)
    _seed_food(collections=collections, owner_email=email, user_id=target_user_id, people=people, now=now, campus=campus)
    _seed_privacy_and_sync(collections=collections, owner_email=email, user_id=target_user_id, now=now, campus=campus)
    _seed_merchant_directory(collections, email, now, campus)

    flow = [
        {
            "surface": "Onboarding",
            "story": "Student context is already filled: allowance cycle, BH-2 hostel, mess routine, exam window, and Android sync.",
        },
        {
            "surface": "Dashboard",
            "story": "Current month has allowance, subscriptions, late-night food, pool debt, recent check-ins, and campus intelligence.",
        },
        {
            "surface": "Transactions",
            "story": "Android sync and statement import sit together. Repeated Campus Juice Cafe payments trigger a gentle category review.",
        },
        {
            "surface": "Runway",
            "story": "Allowance runway includes subscriptions, exam safety buffer, after-hours spend, and unpaid pool obligations.",
        },
        {
            "surface": "Food",
            "story": "Verified menu items are usable now, while scanned candidates wait for enough independent confirmations.",
        },
        {
            "surface": "Pool",
            "story": "An open Zepto pool shows join approvals; a completed Blinkit pool shows verified, pending, and review payments.",
        },
        {
            "surface": "Travel",
            "story": "Station-to-campus route has cached geometry, student fare reports, a savings log, and a shared ride pool.",
        },
        {
            "surface": "Privacy",
            "story": "Android consent, AA sandbox consent, parser corrections, and no raw statement/password retention are visible.",
        },
        {
            "surface": "Companion",
            "story": "Recent sync activity shows parsed, duplicate, pool-verified, review, and incomplete notification outcomes.",
        },
    ]

    summary = {
        "email": email,
        "user_id": target_user_id,
        "campus": campus,
        "months_seeded": months,
        "counts": {name: len(items) for name, items in collections.items() if items},
        "current_month_transaction_count": sum(
            1
            for txn in collections["transactions"]
            if isinstance(txn.get("created_at"), dt.datetime)
            and txn.get("user_id") == target_user_id
            and txn["created_at"].year == now.year
            and txn["created_at"].month == now.month
        ),
        "statement_vendor_prompt": "Campus Juice Cafe appears 5 times this month and 4 times in the last seven days.",
        "food_threshold": _food_threshold(14),
        "travel_threshold": _travel_threshold(12),
    }
    return {
        "seed_version": SEED_VERSION,
        "generated_at": now,
        "email": email,
        "target_user_id": target_user_id,
        "demo_accounts": [
            {"email": person["email"], "full_name": person["full_name"], "role": person["role"]}
            for person in people.values()
        ],
        "collections": collections,
        "summary": summary,
        "demo_flow": flow,
    }


def _json_safe(value: Any) -> Any:
    if isinstance(value, dt.datetime):
        return value.isoformat()
    if isinstance(value, dt.date):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    return value


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def _resolve_mongo_uri(cli_value: str | None) -> str:
    if cli_value:
        return cli_value
    repo_root = Path(__file__).resolve().parents[1]
    _load_env_file(repo_root / ".env")
    _load_env_file(repo_root / "backend" / ".env")
    uri = os.environ.get("MONGO_URI")
    if not uri:
        raise SystemExit("MONGO_URI is required. Pass --mongo-uri or set it in backend/.env.")
    return uri


def _resolve_seed_password(cli_value: str | None) -> str:
    password = cli_value or os.environ.get("DEMO_SEED_PASSWORD")
    if not password and sys.stdin.isatty():
        import getpass

        password = getpass.getpass("Password for the seeded demo accounts: ")
    if not password:
        raise SystemExit("Set DEMO_SEED_PASSWORD or pass --password when applying the seed.")
    if len(password) < 8:
        raise SystemExit("Demo password must contain at least 8 characters.")
    return password


def _hash_password(password: str) -> str:
    import bcrypt

    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _collection_docs_for_insert(docs: Iterable[dict[str, Any]], password_hash: str | None = None) -> list[dict[str, Any]]:
    prepared: list[dict[str, Any]] = []
    for doc in docs:
        copied = deepcopy(doc)
        if password_hash and copied.get("password") == "__HASHED_AT_APPLY__":
            copied["password"] = password_hash
        prepared.append(copied)
    return prepared


def _delete_many(db: Any, collection_name: str, filters: list[dict[str, Any]]) -> int:
    collection = getattr(db, collection_name)
    query = filters[0] if len(filters) == 1 else {"$or": filters}
    result = collection.delete_many(query)
    return int(getattr(result, "deleted_count", 0))


def _resolve_db_name(mongo_uri: str, explicit_name: str | None) -> str:
    if explicit_name and explicit_name.strip():
        return explicit_name.strip()
    from urllib.parse import unquote, urlparse

    path = unquote(urlparse(mongo_uri).path or "").strip("/")
    return path or "pocketbuddy"


def build_cleanup_plan(payload: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Build deletion filters without treating shared-pool membership as ownership."""

    email = payload["email"]
    collections = payload["collections"]
    seeded_user_ids = [doc["_id"] for doc in collections["users"]]
    seeded_emails = [doc["email"] for doc in collections["users"]]
    seeded_pool_ids = [doc["_id"] for doc in collections["cart_pools"]]
    plan: dict[str, list[dict[str, Any]]] = {}

    for collection_name in COLLECTION_NAMES:
        owner_filter = {"demo_seed": True, "seed_owner_email": email}
        if collection_name == "users":
            plan[collection_name] = [
                {"email": {"$in": seeded_emails}},
                {"_id": {"$in": seeded_user_ids}},
            ]
        elif collection_name == "profiles":
            plan[collection_name] = [
                {"_id": {"$in": seeded_user_ids}},
                {"user_id": {"$in": seeded_user_ids}},
            ]
        elif collection_name == "cart_pools":
            plan[collection_name] = [owner_filter, {"host_id": {"$in": seeded_user_ids}}]
        elif collection_name == "cart_pool_items":
            plan[collection_name] = [owner_filter, {"pool_id": {"$in": seeded_pool_ids}}]
        elif collection_name == "travel_pools":
            plan[collection_name] = [owner_filter, {"host_id": {"$in": seeded_user_ids}}]
        elif collection_name == "travel_reports":
            plan[collection_name] = [
                owner_filter,
                {"user_id": {"$in": seeded_user_ids}},
                {"reporter_id": {"$in": seeded_user_ids}},
            ]
        elif collection_name == "candidate_subscriptions":
            plan[collection_name] = [
                owner_filter,
                {"distinct_users": {"$in": seeded_user_ids}},
            ]
        elif collection_name in {
            "travel_routes",
            "travel_geo_cache",
            "campus_food",
            "merchant_directory",
            "community_quiz_context",
            "community_quiz_votes",
        }:
            plan[collection_name] = [owner_filter]
        else:
            plan[collection_name] = [owner_filter, {"user_id": {"$in": seeded_user_ids}}]
    return plan


def _validate_payload_for_apply(payload: dict[str, Any]) -> None:
    collections = payload.get("collections")
    if not isinstance(collections, dict):
        raise ValueError("Seed payload is missing collections.")
    for collection_name in COLLECTION_NAMES:
        docs = collections.get(collection_name, [])
        if not isinstance(docs, list):
            raise ValueError(f"{collection_name} must be a list.")
        ids = [doc.get("_id") for doc in docs]
        if any(not item_id for item_id in ids):
            raise ValueError(f"Every {collection_name} document must have an _id.")
        if len(ids) != len(set(ids)):
            raise ValueError(f"Duplicate _id detected in {collection_name}.")


def apply_demo_seed(
    payload: dict[str, Any],
    *,
    mongo_uri: str,
    db_name: str | None = None,
    password: str,
) -> dict[str, Any]:
    """Apply a seed payload to MongoDB."""

    from pymongo import MongoClient

    _validate_payload_for_apply(payload)
    if len(password) < 8:
        raise ValueError("Demo password must contain at least 8 characters.")
    client = MongoClient(mongo_uri)
    try:
        client.admin.command("ping")
    except Exception:
        client.close()
        raise
    resolved_db_name = _resolve_db_name(mongo_uri, db_name)
    db = client[resolved_db_name]

    email = payload["email"]
    collections = payload["collections"]
    target_user_id = payload["target_user_id"]
    password_hash = _hash_password(password)
    cleanup_plan = build_cleanup_plan(payload)
    backups: dict[str, list[dict[str, Any]]] = {}
    deleted: dict[str, int] = {}
    inserted: dict[str, int] = {}
    try:
        for collection_name, filters in cleanup_plan.items():
            query = filters[0] if len(filters) == 1 else {"$or": filters}
            backups[collection_name] = list(getattr(db, collection_name).find(query))
            deleted[collection_name] = _delete_many(db, collection_name, filters)

        for collection_name in COLLECTION_NAMES:
            docs = collections.get(collection_name) or []
            if not docs:
                continue
            prepared = _collection_docs_for_insert(docs, password_hash if collection_name == "users" else None)
            getattr(db, collection_name).insert_many(prepared, ordered=True)
            inserted[collection_name] = len(prepared)

        target_profile = next((doc for doc in collections.get("profiles", []) if doc.get("_id") == target_user_id), None)
        if target_profile:
            critical_profile_fields = {
                key: target_profile[key]
                for key in (
                    "monthly_allowance",
                    "cycle_start_day",
                    "college_name",
                    "campus",
                    "hostel_block",
                    "wing_label",
                    "room_number",
                    "meal_schedule",
                    "mess_enrolled",
                    "mess_billing_model",
                    "mess_monthly_cost",
                    "exam_start_date",
                    "exam_end_date",
                    "exam_safety_buffer",
                    "companion_paired",
                    "companion_sync_enabled",
                    "companion_device_id",
                    "companion_device_name",
                    "companion_last_sync",
                )
                if key in target_profile
            }
            db.profiles.update_one({"_id": target_user_id}, {"$set": critical_profile_fields})
    except Exception as exc:
        rollback_errors: list[str] = []
        for collection_name, filters in cleanup_plan.items():
            try:
                _delete_many(db, collection_name, filters)
                old_docs = backups.get(collection_name) or []
                if old_docs:
                    getattr(db, collection_name).insert_many(old_docs, ordered=True)
            except Exception as rollback_exc:
                rollback_errors.append(f"{collection_name}: {rollback_exc}")
        detail = f" Seed rollback errors: {'; '.join(rollback_errors)}" if rollback_errors else " Previous data was restored."
        client.close()
        raise RuntimeError(f"Demo seed failed before completion.{detail}") from exc

    result = {
        "email": email,
        "target_user_id": target_user_id,
        "database": resolved_db_name,
        "deleted": deleted,
        "inserted": inserted,
        "summary": payload["summary"],
        "demo_accounts": payload["demo_accounts"],
    }
    client.close()
    return result


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed a realistic PocketBuddy demo account.")
    parser.add_argument("--email", default=DEFAULT_EMAIL, help="Target account email to seed.")
    parser.add_argument("--password", default=None, help="Password to set for demo users. Prefer DEMO_SEED_PASSWORD so it is not stored in shell history.")
    parser.add_argument("--name", default=DEFAULT_NAME, help="Full name for the target demo user.")
    parser.add_argument("--campus", default=DEFAULT_CAMPUS, help="Campus name to put in the profile and demo records.")
    parser.add_argument("--monthly-allowance", type=int, default=DEFAULT_ALLOWANCE_RUPEES, help="Monthly allowance in rupees.")
    parser.add_argument("--months", type=int, default=4, help="Number of months of historical data to generate.")
    parser.add_argument("--user-id", default=None, help="Optional explicit target user id. Existing users keep their id automatically.")
    parser.add_argument("--mongo-uri", default=None, help="MongoDB URI. Defaults to MONGO_URI from .env/backend/.env.")
    parser.add_argument("--db-name", default=None, help="Mongo database name if the URI does not include one.")
    parser.add_argument("--dry-run", action="store_true", help="Print summary and demo flow without writing to MongoDB.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    existing_user_id = args.user_id
    mongo_uri = None if args.dry_run else _resolve_mongo_uri(args.mongo_uri)
    seed_password = None if args.dry_run else _resolve_seed_password(args.password)

    if mongo_uri and not existing_user_id:
        from pymongo import MongoClient

        client = MongoClient(mongo_uri)
        client.admin.command("ping")
        db = client[_resolve_db_name(mongo_uri, args.db_name)]
        existing = db.users.find_one(
            {"email": {"$regex": f"^{re.escape(args.email.strip())}$", "$options": "i"}},
            {"_id": 1},
        )
        if existing:
            existing_user_id = existing["_id"]

    payload = build_demo_seed_payload(
        email=args.email,
        full_name=args.name,
        campus=args.campus,
        monthly_allowance=args.monthly_allowance,
        months=args.months,
        user_id=existing_user_id,
    )

    if args.dry_run:
        print(json.dumps(_json_safe({
            "summary": payload["summary"],
            "demo_accounts": payload["demo_accounts"],
            "demo_flow": payload["demo_flow"],
        }), indent=2))
        return 0

    assert mongo_uri is not None
    assert seed_password is not None
    result = apply_demo_seed(
        payload,
        mongo_uri=mongo_uri,
        db_name=args.db_name,
        password=seed_password,
    )
    print(json.dumps(_json_safe(result), indent=2))
    print(f"\nSeeded demo login: {args.email.strip().lower()}")
    print("The target and roommate accounts use the password supplied at runtime; it is not printed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
