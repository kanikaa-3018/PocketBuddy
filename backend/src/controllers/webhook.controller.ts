import { Request, Response } from "express";
import { connectToDatabase } from "../config/mongodb.js";

function parseUpiBody(text: string): { amount: number | null; merchant: string | null } {
  let amount: number | null = null;
  let merchant: string | null = null;

  // Amount pattern (e.g. "Rs. 100", "Rs100", "INR 100", "Rs 100.00")
  const amtMatch = text.match(/(?:RS\.?|INR)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  if (amtMatch) {
    const cleanAmt = amtMatch[1].replace(/,/g, "");
    amount = Math.round(parseFloat(cleanAmt) * 100);
  }

  // Merchant pattern (e.g. "to ABC", "at ABC")
  const toMatch = text.match(/(?:sent\s+)?(?:to|at)\s+([A-Z0-9_\- ]{3,40})/i);
  if (toMatch) {
    merchant = toMatch[1].trim().replace(/\s+/g, "_").slice(0, 80);
  }

  const upiMatch = text.match(/UPI\/([A-Z0-9_\-]+)/i);
  if (!merchant && upiMatch) {
    merchant = upiMatch[1];
  }

  return { amount, merchant };
}

export async function ingestNotification(req: Request, res: Response) {
  try {
    const { user_id, pairing_code, body, source, type, device_name } = req.body;

    if (!user_id || !body) {
      return res.status(400).json({ status: "missing_fields" });
    }

    const { db } = await connectToDatabase();

    const profile = await db.collection("profiles").findOne({ _id: user_id as any });
    if (!profile) {
      return res.status(404).json({ status: "user_not_found" });
    }

    if (profile.pairing_code && pairing_code && profile.pairing_code !== pairing_code) {
      return res.status(403).json({ status: "invalid_pairing_code" });
    }

    const deviceName = device_name ?? "Companion Link";
    const src = source ?? "UPI";

    // Insert pending log
    const logId = globalThis.crypto.randomUUID();
    const logRow = {
      _id: logId as any,
      user_id: user_id,
      device_name: deviceName,
      notification_source: src,
      raw_body: body,
      processing_status: "pending",
      created_at: new Date(),
    };
    await db.collection("companion_sync_log").insertOne(logRow);

    const { amount, merchant } = parseUpiBody(body);

    if (!amount || !merchant) {
      await db.collection("companion_sync_log").updateOne(
        { _id: logId as any },
        { $set: { processing_status: "failed" } }
      );
      return res.json({ status: "parse_failed" });
    }

    // Look up merchant directory
    const md = await db.collection("merchant_directory").findOne({ raw_string: merchant });

    const txnSource = type === "sms" ? "companion_sms" : "companion_notification";
    const txnId = globalThis.crypto.randomUUID();

    const newTxn = {
      _id: txnId as any,
      user_id: user_id,
      amount,
      raw_merchant_string: merchant,
      mapped_merchant_name: md?.display_name ?? null,
      category: md?.category ?? null,
      is_mapped: !!md,
      source: txnSource,
      raw_notification_body: body,
      created_at: new Date(),
    };
    await db.collection("transactions").insertOne(newTxn);

    await db.collection("companion_sync_log").updateOne(
      { _id: logId as any },
      {
        $set: {
          processing_status: "parsed",
          parsed_amount: amount,
          parsed_merchant: merchant,
        },
      }
    );

    await db.collection("profiles").updateOne(
      { _id: user_id as any },
      {
        $set: {
          companion_paired: true,
          companion_device_name: deviceName,
          companion_last_sync: new Date(),
        },
      }
    );

    res.json({ status: "ok", transaction_id: txnId });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to ingest notification" });
  }
}
