import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { connectToDatabase } from "../config/mongodb.js";

// Helper to map MongoDB _id to string id for frontend compatibility and serialization
function mapDoc(doc: any) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

function mapDocs(docs: any[]) {
  return docs.map(mapDoc);
}

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const profile = await db.collection("profiles").findOne({ _id: req.userId as any });
    res.json(mapDoc(profile));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch profile" });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    await db.collection("profiles").updateOne(
      { _id: req.userId as any },
      { $set: { ...req.body, updated_at: new Date() } }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
}

export async function getTransactions(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const txns = await db
      .collection("transactions")
      .find({ user_id: req.userId })
      .sort({ created_at: -1 })
      .toArray();
    res.json(mapDocs(txns));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch transactions" });
  }
}

export async function insertTransaction(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const id = globalThis.crypto.randomUUID();
    const newTxn = {
      _id: id as any,
      user_id: req.userId,
      amount: req.body.amount,
      raw_merchant_string: req.body.raw_merchant_string,
      mapped_merchant_name: req.body.mapped_merchant_name || null,
      category: req.body.category || null,
      is_mapped: !!req.body.mapped_merchant_name,
      source: req.body.source || "manual",
      raw_notification_body: req.body.raw_notification_body || null,
      created_at: req.body.created_at ? new Date(req.body.created_at) : new Date(),
    };
    await db.collection("transactions").insertOne(newTxn);
    res.json(mapDoc(newTxn));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to insert transaction" });
  }
}

export async function deleteRecentTransactions(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const { startDate } = req.body;
    if (!startDate) {
      return res.status(400).json({ error: "startDate is required" });
    }
    await db.collection("transactions").deleteMany({
      user_id: req.userId,
      created_at: { $gte: new Date(startDate) },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete transactions" });
  }
}

export async function getSubscriptions(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const subs = await db.collection("subscriptions").find({ user_id: req.userId }).toArray();
    res.json(mapDocs(subs));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch subscriptions" });
  }
}

export async function insertSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const id = globalThis.crypto.randomUUID();
    const newSub = {
      _id: id as any,
      user_id: req.userId,
      service_name: req.body.service_name,
      amount: req.body.amount,
      next_debit_date: req.body.next_debit_date,
      detected_from: req.body.detected_from || "manual",
      is_active: req.body.is_active ?? true,
      created_at: new Date(),
    };
    await db.collection("subscriptions").insertOne(newSub);
    res.json(mapDoc(newSub));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to insert subscription" });
  }
}

export async function updateSubscriptionIsActive(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const { id, is_active } = req.body;
    await db.collection("subscriptions").updateOne(
      { _id: id as any, user_id: req.userId },
      { $set: { is_active: is_active } }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update subscription" });
  }
}

export async function deleteSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const { id } = req.body;
    await db.collection("subscriptions").deleteOne({ _id: id as any, user_id: req.userId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete subscription" });
  }
}

export async function getCampusFood(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const food = await db.collection("campus_food_options").find({ is_active: true }).toArray();
    res.json(mapDocs(food));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch food options" });
  }
}

export async function getCartPools(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const profile = await db.collection("profiles").findOne({ _id: req.userId as any });
    if (!profile || !profile.wing_label) {
      return res.json([]);
    }
    const pools = await db
      .collection("cart_pools")
      .find({ wing_label: profile.wing_label })
      .sort({ created_at: -1 })
      .toArray();
    res.json(mapDocs(pools));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch cart pools" });
  }
}

export async function getCartPool(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const pool = await db.collection("cart_pools").findOne({ _id: req.params.id as any });
    res.json(mapDoc(pool));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch cart pool" });
  }
}

export async function insertCartPool(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const id = globalThis.crypto.randomUUID();
    const newPool = {
      _id: id as any,
      created_by: req.userId,
      created_by_name: req.body.created_by_name || "Unknown",
      wing_label: req.body.wing_label,
      platform: req.body.platform,
      status: "open",
      min_cart_value: req.body.min_cart_value,
      delivery_fee: req.body.delivery_fee,
      expires_at: new Date(req.body.expires_at),
      created_at: new Date(),
    };
    await db.collection("cart_pools").insertOne(newPool);
    res.json(mapDoc(newPool));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create cart pool" });
  }
}

export async function getCartPoolItems(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const items = await db
      .collection("cart_pool_items")
      .find({ pool_id: req.params.id })
      .sort({ created_at: 1 })
      .toArray();
    res.json(mapDocs(items));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch cart items" });
  }
}

export async function insertCartPoolItem(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const id = globalThis.crypto.randomUUID();
    const newItem = {
      _id: id as any,
      pool_id: req.params.id,
      added_by_name: req.body.added_by_name,
      item_description: req.body.item_description,
      estimated_price: req.body.estimated_price,
      created_at: new Date(),
    };
    await db.collection("cart_pool_items").insertOne(newItem);
    res.json(mapDoc(newItem));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to add cart item" });
  }
}

export async function insertCheckinLog(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const id = globalThis.crypto.randomUUID();
    const log = {
      _id: id as any,
      user_id: req.userId,
      response: req.body.response,
      stress_note: req.body.stress_note || null,
      food_gap_hours: req.body.food_gap_hours,
      suggestion_given: req.body.suggestion_given || null,
      created_at: new Date(),
    };
    await db.collection("checkin_logs").insertOne(log);
    res.json(mapDoc(log));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to log checkin" });
  }
}

export async function identifyMerchant(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const { raw_merchant_string, display_name, category } = req.body;
    const existing = await db.collection("merchant_directory").findOne({ raw_string: raw_merchant_string });
    if (existing) {
      await db.collection("merchant_directory").updateOne(
        { _id: existing._id },
        { $set: { display_name: display_name, category: category }, $inc: { confirmation_count: 1 } }
      );
    } else {
      await db.collection("merchant_directory").insertOne({
        _id: globalThis.crypto.randomUUID() as any,
        raw_string: raw_merchant_string,
        display_name: display_name,
        category: category,
        campus: "ABV-IIITM Gwalior",
        mapped_by_user_id: req.userId,
        confirmation_count: 1,
        created_at: new Date(),
      });
    }
    await db.collection("transactions").updateMany(
      { user_id: req.userId, raw_merchant_string: raw_merchant_string },
      { $set: { mapped_merchant_name: display_name, category: category, is_mapped: true } }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to map merchant" });
  }
}

export async function getCompanionSyncLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const { db } = await connectToDatabase();
    const logs = await db
      .collection("companion_sync_log")
      .find({ user_id: req.userId })
      .sort({ created_at: -1 })
      .limit(20)
      .toArray();
    res.json(mapDocs(logs));
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch companion logs" });
  }
}
