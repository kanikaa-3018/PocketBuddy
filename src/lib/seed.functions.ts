import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Seed demo data for the current user. Only inserts if they have no transactions yet.
export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Check if already seeded
    const { count } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((count ?? 0) > 0) return { seeded: false, reason: "already_has_data" };

    const now = new Date();
    const daysAgo = (d: number, h: number = 0) => {
      const x = new Date(now);
      x.setDate(x.getDate() - d);
      x.setHours(h || (10 + Math.floor(Math.random() * 12)), Math.floor(Math.random() * 60), 0, 0);
      return x.toISOString();
    };

    const txns = [
      // food companion
      { amount: 3000, raw_merchant_string: "BH2_NIGHT_CANTEEN", mapped_merchant_name: "BH-2 Night Canteen", category: "food", is_mapped: true, source: "companion_notification", created_at: daysAgo(0, 22) },
      { amount: 1500, raw_merchant_string: "BH2_NIGHT_CANTEEN", mapped_merchant_name: "BH-2 Night Canteen", category: "food", is_mapped: true, source: "companion_notification", created_at: daysAgo(1, 21) },
      { amount: 4500, raw_merchant_string: "BH2_NIGHT_CANTEEN", mapped_merchant_name: "BH-2 Night Canteen", category: "food", is_mapped: true, source: "companion_notification", created_at: daysAgo(2, 23) },
      { amount: 4500, raw_merchant_string: "BH2_NIGHT_CANTEEN", mapped_merchant_name: "BH-2 Night Canteen", category: "food", is_mapped: true, source: "companion_notification", created_at: daysAgo(4, 22) },
      { amount: 2000, raw_merchant_string: "CAMPUS_CAFE_001", mapped_merchant_name: "Campus Café", category: "food", is_mapped: true, source: "companion_notification", created_at: daysAgo(5, 15) },
      { amount: 4000, raw_merchant_string: "CAMPUS_CAFE_001", mapped_merchant_name: "Campus Café", category: "food", is_mapped: true, source: "companion_notification", created_at: daysAgo(6, 16) },
      { amount: 7000, raw_merchant_string: "CAMPUS_CAFE_001", mapped_merchant_name: "Campus Café", category: "food", is_mapped: true, source: "companion_notification", created_at: daysAgo(8, 13) },
      { amount: 6000, raw_merchant_string: "GATE_DHABA_X", mapped_merchant_name: "Gate Dhaba", category: "food", is_mapped: true, source: "companion_notification", created_at: daysAgo(9, 20) },
      { amount: 5000, raw_merchant_string: "GATE_DHABA_X", mapped_merchant_name: "Gate Dhaba", category: "food", is_mapped: true, source: "companion_notification", created_at: daysAgo(11, 19) },
      { amount: 6000, raw_merchant_string: "BH1_MESS_HALL", mapped_merchant_name: "BH-1 Mess Hall", category: "food", is_mapped: true, source: "companion_notification", created_at: daysAgo(13, 20) },
      // food manual
      { amount: 19900, raw_merchant_string: "Dominos", mapped_merchant_name: "Dominos", category: "food", is_mapped: true, source: "manual", created_at: daysAgo(3, 21) },
      { amount: 1000, raw_merchant_string: "Mess Extra Roti", mapped_merchant_name: "Mess Extra Roti", category: "food", is_mapped: true, source: "manual", created_at: daysAgo(7, 13) },
      { amount: 1500, raw_merchant_string: "Chai Tapri Gate 2", mapped_merchant_name: "Chai Tapri Gate 2", category: "food", is_mapped: true, source: "manual", created_at: daysAgo(10, 17) },
      // stationery
      { amount: 1000, raw_merchant_string: "SHARMA_XEROX", mapped_merchant_name: "Sharma Xerox", category: "stationery", is_mapped: true, source: "companion_notification", created_at: daysAgo(12, 14) },
      { amount: 3000, raw_merchant_string: "SHARMA_XEROX", mapped_merchant_name: "Sharma Xerox", category: "stationery", is_mapped: true, source: "companion_notification", created_at: daysAgo(15, 11) },
      { amount: 4500, raw_merchant_string: "CAMPUS_BOOKSTORE", mapped_merchant_name: "Campus Bookstore", category: "stationery", is_mapped: true, source: "companion_notification", created_at: daysAgo(16, 12) },
      { amount: 2500, raw_merchant_string: "CAMPUS_BOOKSTORE", mapped_merchant_name: "Campus Bookstore", category: "stationery", is_mapped: true, source: "companion_notification", created_at: daysAgo(18, 11) },
      // travel
      { amount: 3000, raw_merchant_string: "AUTO_STAND_GATE1", mapped_merchant_name: "Auto Stand Gate 1", category: "travel", is_mapped: true, source: "companion_sms", created_at: daysAgo(2, 9) },
      { amount: 2000, raw_merchant_string: "AUTO_STAND_GATE1", mapped_merchant_name: "Auto Stand Gate 1", category: "travel", is_mapped: true, source: "companion_sms", created_at: daysAgo(6, 18) },
      { amount: 8000, raw_merchant_string: "OLA_RIDE", mapped_merchant_name: "Ola Ride", category: "travel", is_mapped: true, source: "companion_sms", created_at: daysAgo(14, 19) },
      // subscriptions
      { amount: 14900, raw_merchant_string: "SPOTIFY_PREMIUM", mapped_merchant_name: "Spotify Premium", category: "subscription", is_mapped: true, source: "companion_notification", created_at: daysAgo(17, 8) },
      { amount: 12900, raw_merchant_string: "YOUTUBE_PREMIUM", mapped_merchant_name: "YouTube Premium", category: "subscription", is_mapped: true, source: "companion_notification", created_at: daysAgo(11, 8) },
      { amount: 23900, raw_merchant_string: "JIO_RECHARGE", mapped_merchant_name: "Jio Recharge", category: "recharge", is_mapped: true, source: "companion_notification", created_at: daysAgo(19, 10) },
      // entertainment
      { amount: 10000, raw_merchant_string: "CAMPUS_FEST", mapped_merchant_name: "Campus Fest Ticket", category: "entertainment", is_mapped: true, source: "manual", created_at: daysAgo(15, 18) },
      { amount: 6000, raw_merchant_string: "PRINTOUT_COLOR", mapped_merchant_name: "Printout Color", category: "other", is_mapped: true, source: "manual", created_at: daysAgo(8, 15) },
      // unmapped
      { amount: 5500, raw_merchant_string: "XYZT_MERCH_009", mapped_merchant_name: null, category: null, is_mapped: false, source: "companion_notification", created_at: daysAgo(1, 17) },
      { amount: 3500, raw_merchant_string: "QK_PAY_SNACKS", mapped_merchant_name: null, category: null, is_mapped: false, source: "companion_notification", created_at: daysAgo(3, 16) },
      { amount: 4000, raw_merchant_string: "UPI_TXN_BALAJI", mapped_merchant_name: null, category: null, is_mapped: false, source: "companion_notification", created_at: daysAgo(5, 18) },
    ].map((t) => ({ ...t, user_id: userId }));

    await supabase.from("transactions").insert(txns);

    // Companion sync log
    const syncLog = [
      { device_name: "Redmi Note 12", notification_source: "Google Pay", raw_body: "You paid ₹30 to BH2_NIGHT_CANTEEN on UPI", parsed_amount: 3000, parsed_merchant: "BH2_NIGHT_CANTEEN", processing_status: "parsed" },
      { device_name: "Redmi Note 12", notification_source: "PhonePe", raw_body: "Paid ₹55 to XYZT_MERCH_009 from PhonePe", parsed_amount: 5500, parsed_merchant: "XYZT_MERCH_009", processing_status: "parsed" },
      { device_name: "Redmi Note 12", notification_source: "Google Pay", raw_body: "You paid ₹45 to BH2_NIGHT_CANTEEN on UPI", parsed_amount: 4500, parsed_merchant: "BH2_NIGHT_CANTEEN", processing_status: "parsed" },
      { device_name: "Redmi Note 12", notification_source: "Google Pay", raw_body: "You paid ₹35 to QK_PAY_SNACKS on UPI", parsed_amount: null, parsed_merchant: null, processing_status: "pending" },
      { device_name: "Redmi Note 12", notification_source: "SBI Bank", raw_body: "Account update — call for details", parsed_amount: null, parsed_merchant: null, processing_status: "failed" },
    ].map((s, i) => ({ ...s, user_id: userId, created_at: new Date(Date.now() - i * 3600 * 1000).toISOString() }));

    await supabase.from("companion_sync_log").insert(syncLog);

    // Subscriptions
    const subs = [
      { user_id: userId, service_name: "Spotify Premium", amount: 14900, next_debit_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), detected_from: "auto_detected", is_active: true },
      { user_id: userId, service_name: "YouTube Premium", amount: 12900, next_debit_date: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10), detected_from: "auto_detected", is_active: true },
    ];
    await supabase.from("subscriptions").insert(subs);

    // Cart pool + items
    const { data: pool } = await supabase
      .from("cart_pools")
      .insert({
        created_by: userId,
        created_by_name: "Nishant",
        wing_label: "Wing 4B",
        platform: "zepto",
        status: "open",
        min_cart_value: 19900,
        delivery_fee: 2500,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (pool) {
      await supabase.from("cart_pool_items").insert([
        { pool_id: pool.id, added_by_name: "Nishant", item_description: "Amul Toned Milk 500ml", estimated_price: 3200 },
        { pool_id: pool.id, added_by_name: "Nishant", item_description: "Parle-G Biscuits", estimated_price: 1000 },
        { pool_id: pool.id, added_by_name: "Kavya", item_description: "Maggi 4-pack", estimated_price: 4800 },
      ]);
    }

    // Checkin log
    await supabase.from("checkin_logs").insert({
      user_id: userId,
      response: "skipped",
      stress_note: "was studying for exam",
      food_gap_hours: 18.5,
      suggestion_given: "BH-2 Night Canteen Chai ₹15",
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    });

    // Update profile companion info
    await supabase
      .from("profiles")
      .update({
        companion_paired: true,
        companion_device_name: "Redmi Note 12",
        companion_last_sync: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        upi_apps_used: ["gpay", "phonepe"],
        mess_enrolled: true,
        meal_schedule: { breakfast: false, lunch: true, dinner: true },
      })
      .eq("id", userId);

    return { seeded: true };
  });
