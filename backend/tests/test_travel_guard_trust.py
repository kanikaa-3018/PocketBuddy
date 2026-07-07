import datetime
import os
import unittest

os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017/pocketbuddy_test")

from app.api.travel import (  # noqa: E402
    build_travel_ai_prompt,
    build_travel_trust_metadata,
    compute_travel_verification_threshold,
    _robust_fare_range,
    _trusted_fare_reports,
)


def _report(user_id: str, amount: float, days_ago: int = 1, **extra):
    created_at = datetime.datetime.utcnow() - datetime.timedelta(days=days_ago)
    return {
        "user_id": user_id,
        "final_amount": amount,
        "created_at": created_at,
        "upvotes": [],
        "downvotes": [],
        **extra,
    }


class TravelGuardTrustTests(unittest.TestCase):
    def test_travel_threshold_never_uses_tiny_three_report_count(self):
        threshold = compute_travel_verification_threshold(active_reporters=8)

        self.assertGreaterEqual(threshold, 5)

    def test_travel_threshold_scales_with_route_reporter_population(self):
        small_campus = compute_travel_verification_threshold(active_reporters=20)
        large_campus = compute_travel_verification_threshold(active_reporters=1200)

        self.assertGreater(large_campus, small_campus)
        self.assertLessEqual(large_campus, 25)

    def test_repeated_reports_from_same_user_count_once_for_fare_model(self):
        reports = [
            _report("u1", 160, days_ago=4),
            _report("u1", 900, days_ago=1),
            _report("u2", 165),
            _report("u3", 170),
            _report("u4", 175),
            _report("u5", 180),
        ]

        trusted = _trusted_fare_reports(reports)
        reporter_ids = [r["user_id"] for r in trusted]

        self.assertEqual(reporter_ids.count("u1"), 1)
        self.assertEqual(len(set(reporter_ids)), len(reporter_ids))
        self.assertIn(900, [r["final_amount"] for r in trusted])
        self.assertNotIn(160, [r["final_amount"] for r in trusted])

    def test_three_student_reports_do_not_override_distance_model(self):
        reports = [
            _report("u1", 150),
            _report("u2", 160),
            _report("u3", 170),
        ]

        trusted = _trusted_fare_reports(reports)
        robust = _robust_fare_range([r["final_amount"] for r in trusted])

        self.assertIsNone(robust)

    def test_five_distinct_recent_reports_can_create_student_anchor(self):
        reports = [
            _report("u1", 150),
            _report("u2", 155),
            _report("u3", 160),
            _report("u4", 165),
            _report("u5", 1000),
        ]

        trusted = _trusted_fare_reports(reports)
        robust = _robust_fare_range([r["final_amount"] for r in trusted])

        self.assertIsNotNone(robust)
        self.assertEqual(robust["sample_size"], 5)
        self.assertLess(robust["median_fare"], 200)

    def test_travel_trust_metadata_marks_learning_before_threshold(self):
        metadata = build_travel_trust_metadata({
            "fare_source": "distance_model",
            "report_sample_size": 3,
            "report_threshold": 5,
        })

        self.assertEqual(metadata["trust_stage"], "learning")
        self.assertEqual(metadata["trust_badge"], "Learning")
        self.assertIn("3/5", metadata["trust_reason"])

    def test_travel_trust_metadata_marks_student_verified_after_threshold(self):
        metadata = build_travel_trust_metadata({
            "fare_source": "student_reports",
            "report_sample_size": 5,
            "report_threshold": 5,
        })

        self.assertEqual(metadata["trust_stage"], "student_verified")
        self.assertEqual(metadata["trust_badge"], "Student verified")
        self.assertGreaterEqual(metadata["trust_score"], 80)

    def test_travel_trust_metadata_keeps_empty_routes_as_model_estimates(self):
        metadata = build_travel_trust_metadata({
            "fare_source": "distance_model",
            "report_sample_size": 0,
            "report_threshold": 5,
        })

        self.assertEqual(metadata["trust_stage"], "model_estimate")
        self.assertEqual(metadata["trust_badge"], "Model estimate")
        self.assertIn("distance", metadata["trust_reason"].lower())

    def test_nova_prompt_forbids_invented_fares_and_live_app_claims(self):
        prompt = build_travel_ai_prompt(
            college="ABV-IIITM Gwalior",
            region="Gwalior, Madhya Pradesh",
            route_name="Gwalior Railway Station to ABV-IIITM",
            distance_km=12.0,
            mode="Auto",
            min_fare=140,
            max_fare=180,
            median_fare=160,
            fare_anchor=165,
            fare_anchor_label="5 distinct student reports",
            report_count=5,
            surge_context="",
            user_situation="late night with luggage",
            dialect="friendly student Hindi",
        )

        self.assertIn("Never invent fare numbers", prompt)
        self.assertIn("Do not imply live Ola, Uber, Rapido", prompt)
        self.assertIn("Output ONLY valid JSON", prompt)


if __name__ == "__main__":
    unittest.main()
