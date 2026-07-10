export function isValidUpiId(value: string | null | undefined): boolean {
  const upiId = String(value ?? "").trim();
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/.test(upiId);
}

export function buildUpiPaymentIntent({
  upiId,
  payeeName,
  amountRupees,
  note,
}: {
  upiId: string | null | undefined;
  payeeName: string | null | undefined;
  amountRupees: number;
  note: string;
}): string | null {
  const cleanUpi = String(upiId ?? "").trim();
  const cleanName = String(payeeName ?? "PocketBuddy Host").trim() || "PocketBuddy Host";
  const cleanNote = String(note ?? "Travel split").trim() || "Travel split";
  const amount = Number(amountRupees);

  if (!isValidUpiId(cleanUpi) || !Number.isFinite(amount) || amount <= 0 || amount > 50000) {
    return null;
  }

  const params = [
    ["pa", cleanUpi],
    ["pn", cleanName],
    ["am", amount.toFixed(2)],
    ["cu", "INR"],
    ["tn", cleanNote.slice(0, 80)],
  ];

  return `upi://pay?${params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&")}`;
}
