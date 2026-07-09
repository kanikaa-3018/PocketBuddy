import os
import unittest

os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017/pocketbuddy_test")

from app.api.rag import RagReq, _build_local_campus_insight, build_local_recommendation  # noqa: E402


class FoodRagRecommendationTests(unittest.TestCase):
    def test_local_food_recommendation_ignores_review_candidates(self):
        foods = [
            {
                "_id": "pending-cheap",
                "venue_name": "Unknown Scan",
                "item_name": "OCR Meal",
                "price": 1000,
                "status": "pending_verification",
                "source": "ocr_menu_scan",
            },
            {
                "_id": "active-meal",
                "venue_name": "BH-2 Night Canteen",
                "item_name": "Egg Paratha",
                "price": 4500,
                "status": "active",
                "source": "community_item_quiz",
                "verification_votes": 4,
                "available_from": "20:00",
                "available_until": "02:00",
            },
        ]

        result = build_local_recommendation(
            RagReq(days_left=10, remaining_budget=700, spent_today=80),
            foods,
        )

        self.assertEqual(result["item"]["item_name"], "Egg Paratha")
        self.assertNotIn("OCR Meal", result["recommendation"])

    def test_local_campus_intel_returns_structured_food_nudge(self):
        result = _build_local_campus_insight(
            spend_7=420,
            remaining=1800,
            days_left=12,
            safe_daily=150,
            last_food_hours=11,
            upcoming_commitments=0,
            upcoming_commitment_count=0,
            food_option={
                "venue": "BH-2 Night Canteen",
                "item": "Egg Paratha",
                "price_rs": 45,
                "trust": "Trusted",
                "why": "Open late",
            },
        )

        self.assertEqual(result["focus"], "routine")
        self.assertEqual(result["headline"], "Routine check due")
        self.assertNotIn("Egg Paratha", result["next_action"])
        self.assertIn("11 hours", result["why"])
        self.assertEqual([signal["label"] for signal in result["signals"]], ["Runway", "Spend pace", "Commitments", "Routine"])


if __name__ == "__main__":
    unittest.main()
