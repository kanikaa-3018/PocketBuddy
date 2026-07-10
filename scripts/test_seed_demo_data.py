import datetime as dt
import sys
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))

from app.services.runway import build_runway_forecast, derive_pool_obligations
from scripts.seed_demo_data import build_demo_seed_payload


class DemoSeedDataTest(unittest.TestCase):
    def setUp(self) -> None:
        self.now = dt.datetime(2026, 7, 10, 12, 0, 0)
        self.payload = build_demo_seed_payload(
            now=self.now,
            email="charizardoped@gmail.com",
            full_name="Nishant Harkut",
            months=4,
        )
        self.uid = self.payload["target_user_id"]
        self.collections = self.payload["collections"]

    def _target_profile(self) -> dict:
        return next(profile for profile in self.collections["profiles"] if profile["_id"] == self.uid)

    def _target_transactions(self) -> list[dict]:
        return [txn for txn in self.collections["transactions"] if txn.get("user_id") == self.uid]

    def _target_subscriptions(self) -> list[dict]:
        return [sub for sub in self.collections["subscriptions"] if sub.get("user_id") == self.uid]

    def test_runway_seed_is_demo_safe_but_not_flat(self) -> None:
        profile = self._target_profile()
        obligations = derive_pool_obligations(
            user_id=self.uid,
            user_name="Nishant Harkut",
            pools=self.collections["cart_pools"],
            items=self.collections["cart_pool_items"],
            now=self.now,
        )

        forecast = build_runway_forecast(
            profile=profile,
            transactions=self._target_transactions(),
            subscriptions=self._target_subscriptions(),
            pool_obligations=obligations,
            now=self.now,
        )

        self.assertNotEqual(forecast["status"], "shortfall")
        self.assertEqual(forecast["projection"]["ask_home_amount"], 0)
        self.assertGreaterEqual(forecast["projection"]["forecast_end_balance"], 0)
        self.assertLess(forecast["projection"]["shortfall_probability"], 0.35)

        horizon_balances = [horizon["projected_balance"] for horizon in forecast["horizons"]]
        self.assertTrue(horizon_balances)
        self.assertGreaterEqual(min(horizon_balances), 0)
        self.assertGreater(forecast["projection"]["projected_daily_spend"], 0)

    def test_seed_covers_demo_surfaces(self) -> None:
        profile = self._target_profile()
        self.assertEqual(profile["exam_start_date"], "2026-07-09")
        self.assertEqual(profile["exam_end_date"], "2026-07-15")

        pool_statuses = Counter(pool["status"] for pool in self.collections["cart_pools"])
        self.assertGreaterEqual(pool_statuses["open"], 1)
        self.assertGreaterEqual(pool_statuses["completed"], 1)
        self.assertGreaterEqual(pool_statuses["cancelled"], 1)

        open_pool = next(pool for pool in self.collections["cart_pools"] if pool["status"] == "open")
        self.assertGreaterEqual((open_pool["expires_at"] - self.now).total_seconds(), 24 * 60 * 60)
        self.assertTrue(any(req["status"] == "pending" for req in open_pool.get("join_requests", [])))

        checkin_types = {checkin["type"] for checkin in self.collections["checkin_logs"]}
        self.assertIn("meal_checkin", checkin_types)
        self.assertIn("exam_window", checkin_types)

        self.assertGreaterEqual(len(self.collections["travel_reports"]), 5)
        self.assertGreaterEqual(len(self.collections["campus_food"]), 6)

        batch = self.collections["statement_import_batches"][0]
        prompt = batch["vendor_review_prompts"][0]
        self.assertEqual(prompt["display_name"], "Campus Juice Cafe")
        self.assertGreaterEqual(prompt["count_this_month"], 5)

        july_income = [
            txn
            for txn in self._target_transactions()
            if txn["direction"] == "credit" and txn["created_at"].year == 2026 and txn["created_at"].month == 7
        ]
        income_names = {txn["mapped_merchant_name"] for txn in july_income}
        self.assertIn("Home allowance", income_names)
        self.assertIn("Internship stipend", income_names)


if __name__ == "__main__":
    unittest.main()
