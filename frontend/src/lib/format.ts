// Currency + date formatting (INR, IST)
const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export const rupees = (paisa: number): string => {
  const value = Number(paisa);
  if (!Number.isFinite(value)) return "₹0";
  return `₹${inrFmt.format(Math.round(value / 100))}`;
};
export const rupeesFromInt = (rupeesInt: number): string =>
  `₹${inrFmt.format(Math.round(Number.isFinite(Number(rupeesInt)) ? Number(rupeesInt) : 0))}`;

export function formatMinutesLeft(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(Number.isFinite(Number(minutes)) ? Number(minutes) : 0));
  if (safeMinutes <= 0) return "Closed";
  if (safeMinutes < 60) return `${safeMinutes}m left`;

  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (hours < 48) {
    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h left` : `${days}d left`;
}

export function relativeTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function absoluteDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function shortDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Cycle calculation
export function getCycleStart(cycleStartDay: number, now = new Date()): Date {
  const y = now.getFullYear(),
    m = now.getMonth(),
    d = now.getDate();
  const candidate = new Date(y, m, cycleStartDay, 0, 0, 0, 0);
  if (d >= cycleStartDay) return candidate;
  return new Date(y, m - 1, cycleStartDay, 0, 0, 0, 0);
}

export function getCycleEnd(cycleStart: Date): Date {
  const e = new Date(cycleStart);
  e.setDate(e.getDate() + 30);
  return e;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

// IST current time helpers
export function nowIST(): Date {
  return new Date();
}

export function isTimeInRange(now: Date, from: string, until: string): boolean {
  const [fh, fm] = from.split(":").map(Number);
  const [uh, um] = until.split(":").map(Number);
  const nMin = now.getHours() * 60 + now.getMinutes();
  const fMin = fh * 60 + fm;
  const uMin = uh * 60 + um;
  if (uMin < fMin) return nMin >= fMin || nMin <= uMin;
  return nMin >= fMin && nMin <= uMin;
}

export function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}
