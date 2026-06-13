import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  signup,
  loginWithPassword,
  loginWithPhone,
  logout,
  getMe,
} from "../controllers/auth.controller.js";
import {
  getProfile,
  updateProfile,
  getTransactions,
  insertTransaction,
  deleteRecentTransactions,
  getSubscriptions,
  insertSubscription,
  updateSubscriptionIsActive,
  deleteSubscription,
  getCampusFood,
  getCartPools,
  getCartPool,
  insertCartPool,
  getCartPoolItems,
  insertCartPoolItem,
  insertCheckinLog,
  identifyMerchant,
  getCompanionSyncLogs,
} from "../controllers/db.controller.js";
import { ingestNotification } from "../controllers/webhook.controller.js";
import { seedDemoData } from "../controllers/seed.controller.js";

const router = Router();

// Public Webhook route
router.post("/public/ingest-notification", ingestNotification);

// Auth routes
router.post("/auth/signup", signup);
router.post("/auth/login", loginWithPassword);
router.post("/auth/login/phone", loginWithPhone);
router.post("/auth/logout", requireAuth, logout);
router.get("/auth/me", getMe);

// Authenticated DB routes
router.post("/seed", requireAuth, seedDemoData);
router.get("/profile", requireAuth, getProfile);
router.post("/profile", requireAuth, updateProfile);
router.get("/transactions", requireAuth, getTransactions);
router.post("/transactions", requireAuth, insertTransaction);
router.post("/transactions/delete-recent", requireAuth, deleteRecentTransactions);

router.get("/subscriptions", requireAuth, getSubscriptions);
router.post("/subscriptions", requireAuth, insertSubscription);
router.post("/subscriptions/toggle-active", requireAuth, updateSubscriptionIsActive);
router.post("/subscriptions/delete", requireAuth, deleteSubscription);

router.get("/campus-food", requireAuth, getCampusFood);

router.get("/cart-pools", requireAuth, getCartPools);
router.get("/cart-pools/:id", requireAuth, getCartPool);
router.post("/cart-pools", requireAuth, insertCartPool);

router.get("/cart-pools/:id/items", requireAuth, getCartPoolItems);
router.post("/cart-pools/:id/items", requireAuth, insertCartPoolItem);

router.post("/checkins", requireAuth, insertCheckinLog);
router.post("/merchants/identify", requireAuth, identifyMerchant);

router.get("/companion/logs", requireAuth, getCompanionSyncLogs);

export default router;
