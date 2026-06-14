import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  rupees,
  shortDate,
  relativeTime,
  getCycleStart,
  getCycleEnd,
  daysBetween,
  isTimeInRange,
  fmtTime,
} from "@/lib/format";
import {
  getProfile,
  getTransactions,
  getCampusFood,
  getSubscriptions,
  getCartPools,
  insertTransaction,
  insertCheckinLog,
  identifyMerchant,
} from "@/lib/api/db.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

type Profile = any;
type Txn = any;
type Food = any;
type Sub = any;
type Pool = any;
type PoolItem = any;

const CATEGORIES = [
  { v: "food", l: "Food" },
  { v: "stationery", l: "Stationery" },
  { v: "travel", l: "Travel" },
  { v: "other", l: "Other" },
] as const;

function CountUp({ to, duration = 400 }: { to: number; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span className="tnum">{v}</span>;
}

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: () => getProfile(),
  });

  const { data: txns } = useQuery({
    queryKey: ["txns", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: () => getTransactions(),
  });

  // Runway calculation
  const calc = useMemo(() => {
    if (!profile) return null;
    const totalAllowance = profile.monthly_allowance / 100;
    const cycleStart = getCycleStart(profile.cycle_start_day);
    const cycleEnd = getCycleEnd(cycleStart);
    const cycleTxns = (txns ?? []).filter((t) => new Date(t.created_at) >= cycleStart);
    const totalSpent = cycleTxns.reduce((s, t) => s + t.amount, 0) / 100;
    const remaining = Math.max(0, totalAllowance - totalSpent);
    const today = new Date();
    const daysSinceStart = Math.max(1, daysBetween(cycleStart, today));
    const avgDailySpend = totalSpent / daysSinceStart;
    const daysLeft = Math.max(0, daysBetween(today, cycleEnd));
    const runwayDays = avgDailySpend > 0 ? Math.floor(remaining / avgDailySpend) : daysLeft;
    const safeDailyLimit = daysLeft > 0 ? Math.round(remaining / daysLeft) : 0;
    const todayStr = today.toDateString();
    const spentToday =
      (txns ?? [])
        .filter((t) => new Date(t.created_at).toDateString() === todayStr)
        .reduce((s, t) => s + t.amount, 0) / 100;
    return {
      totalAllowance,
      totalSpent,
      remaining,
      cycleEnd,
      daysLeft,
      runwayDays: Math.min(runwayDays, daysLeft + 5),
      safeDailyLimit,
      spentToday,
      pct: Math.min(100, Math.round((totalSpent / totalAllowance) * 100)),
    };
  }, [profile, txns]);



  const { data: subs } = useQuery({
    queryKey: ["subs", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: () => getSubscriptions(),
  });

  const { data: pools } = useQuery({
    queryKey: ["pools", profile?.wing_label],
    enabled: !!profile?.wing_label,
    staleTime: 15_000,
    refetchInterval: 5000, // MongoDB real-time replacement polling
    queryFn: async (): Promise<(Pool & { items: PoolItem[] })[]> => {
      const ps = await getCartPools();
      return ps ?? [];
    },
  });

  const { data: foods } = useQuery({
  queryKey: ["foods"],
  staleTime: 30_000,
  queryFn: () => getCampusFood(),
});

  // Best food suggestion
  const bestFood = useMemo(() => {
    if (!foods?.length) return null;
    const now = new Date();
    const available = foods.filter((f) => isTimeInRange(now, f.available_from, f.available_until));
    if (available.length) {
      return [...available].sort((a, b) => a.price - b.price)[0];
    }
    return foods[0];
  }, [foods]);

  const runwayColor = calc
    ? calc.runwayDays >= 15
      ? "var(--success)"
      : calc.runwayDays >= 7
        ? "var(--warning)"
        : "var(--destructive)"
    : "var(--primary)";

  // Companion indicator
  const compStatus = useMemo(() => {
    if (!profile) return "red";
    if (!profile.companion_paired) return "red";
    if (!profile.companion_last_sync) return "amber";
    const mins = (Date.now() - new Date(profile.companion_last_sync).getTime()) / 60000;
    return mins < 30 ? "green" : "amber";
  }, [profile]);

  // Subscription collisions
  const collisions = useMemo(() => {
    if (!subs || !calc) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date(today);
    week.setDate(week.getDate() + 7);
    return subs
      .filter((s) => s.is_active !== false)
      .filter((s) => {
        const d = new Date(s.next_debit_date);
        return d >= today && d <= week;
      })
      .map((s) => {
        const newLimit =
          calc.daysLeft > 0 ? Math.round((calc.remaining - s.amount / 100) / calc.daysLeft) : 0;
        return { ...s, newLimit, critical: newLimit < 80 };
      });
  }, [subs, calc]);

  const cumulativeCollisionLimit = useMemo(() => {
    if (!collisions.length || !calc) return 0;
    const totalAmount = collisions.reduce((sum, s) => sum + s.amount, 0);
    return calc.daysLeft > 0 ? Math.max(0, Math.round((calc.remaining - totalAmount / 100) / calc.daysLeft)) : 0;
  }, [collisions, calc]);

  // Recent
  const recent = (txns ?? []).slice(0, 8);

  // Identify / Add dialogs state
  const [identifying, setIdentifying] = useState<Txn | null>(null);
  const [adding, setAdding] = useState(false);
  const [showFoodSheet, setShowFoodSheet] = useState(false);

  // Exam check-in
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInExpanded, setCheckInExpanded] = useState(false);
  const [stressNote, setStressNote] = useState("");
  const checkinChecked = useRef(false);

  useEffect(() => {
    if (checkinChecked.current || !profile || !txns) return;
    checkinChecked.current = true;
    const now = new Date();
    if (!profile.exam_start_date || !profile.exam_end_date) return;
    const inExam =
      now >= new Date(profile.exam_start_date) &&
      now <= new Date(profile.exam_end_date + "T23:59:59");
    if (!inExam) return;
    const lastFood = txns.find((t) => t.category === "food");
    const hours = lastFood ? (Date.now() - new Date(lastFood.created_at).getTime()) / 3600000 : 999;
    if (hours < 16) return;
    const lastCk = localStorage.getItem("pocketbuddy_last_checkin");
    if (lastCk && Date.now() - parseInt(lastCk, 10) < 16 * 3600000) return;
    setShowCheckIn(true);
  }, [profile, txns]);

  const foodGapHours = useMemo(() => {
    const lastFood = (txns ?? []).find((t) => t.category === "food");
    return lastFood ? (Date.now() - new Date(lastFood.created_at).getTime()) / 3600000 : 0;
  }, [txns]);

  async function handleCheckInAte() {
    if (!user) return;
    await insertTransaction({
      data: {
        amount: 0,
        raw_merchant_string: "Self-reported: Ate at mess",
        mapped_merchant_name: "Self-reported",
        category: "food",
        source: "manual",
      },
    });
    await insertCheckinLog({
      data: {
        response: "ate",
        food_gap_hours: foodGapHours,
      },
    });
    localStorage.setItem("pocketbuddy_last_checkin", String(Date.now()));
    setShowCheckIn(false);
    qc.invalidateQueries({ queryKey: ["txns"] });
    toast.success("Great, keep fueling through exams ");
  }

  async function handleCheckInSkipped() {
    if (!user) return;
    const suggestion = bestFood
      ? `${bestFood.venue_name} ${bestFood.item_name} ${rupees(bestFood.price)}`
      : "Campus Café";
    await insertCheckinLog({
      data: {
        response: "skipped",
        food_gap_hours: foodGapHours,
        suggestion_given: suggestion,
        stress_note: stressNote,
      },
    });
    localStorage.setItem("pocketbuddy_last_checkin", String(Date.now()));
    setShowCheckIn(false);
    setStressNote("");
    setCheckInExpanded(false);
    if (bestFood) {
      toast(
        `${bestFood.venue_name} has ${bestFood.item_name} (${rupees(bestFood.price)}) — go grab something.`,
      );
    }
  }  return (
    <AppShell>
      <div className="pb-16 pt-8">
      {/* Top bar (for mobile only now since topnav floats) */}
      <div className="flex md:hidden items-center justify-between px-2 mb-6">
        <h1 id="logo-dashboard" className="text-[12px] font-black tracking-[0.2em] text-foreground uppercase">
          Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => nav({ to: "/companion" })}
            title={
              compStatus === "green"
                ? "Companion syncing"
                : compStatus === "amber"
                  ? "Companion idle"
                  : "No companion"
            }
            className="flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-border"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                compStatus === "green"
                  ? "bg-success"
                  : compStatus === "amber"
                    ? "bg-warning"
                    : "bg-destructive"
              }`}
            />
          </button>
          <Badge variant="outline" id="badge-wing" className="bg-white/5 border-border text-foreground font-bold text-[10px]">
            {profile?.wing_label ?? "—"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Main Column (Runway & Pools) */}
        <div className="md:col-span-7 lg:col-span-8 space-y-8 animate-[fadeIn_0.3s_ease-out]">
          {/* Runway Hero Section */}
          <div id="card-runway-status" className="bg-surface rounded-2xl border border-border relative overflow-hidden">
            {/* Elegant Top Gold Gradient Line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-accent-bronze via-accent-amber to-accent-copper opacity-80" />
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
                  Runway Status
                </p>
                <div className="hidden md:flex items-center gap-3">
                  <Badge variant="outline" className="bg-white/5 border-border text-foreground font-bold text-[10px] px-2.5 py-0.5">
                    {profile?.wing_label ?? "—"}
                  </Badge>
                  <button
                    onClick={() => nav({ to: "/companion" })}
                    title="Companion Status"
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-raised border border-border hover:border-white/15 transition-all"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                        compStatus === "green" ? "bg-success" : compStatus === "amber" ? "bg-warning" : "bg-destructive"
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              {!calc ? (
                <Skeleton className="mt-2 h-20 w-full max-w-xs bg-white/5" />
              ) : (
                <>
                  <div className="flex items-baseline gap-2.5">
                    <h2 className="text-[56px] md:text-[76px] font-black tracking-tighter text-foreground tnum leading-none" style={{ color: runwayColor }}>
                      <CountUp to={calc.runwayDays} />
                    </h2>
                    <span className="text-[16px] md:text-[20px] font-bold tracking-widest text-zinc-500 uppercase">Days</span>
                  </div>
                  <p className="mt-3 text-xs md:text-sm text-zinc-400 font-semibold leading-relaxed">
                    Remaining allowance until <span className="text-foreground font-bold">{rupees(calc.totalAllowance * 100)}</span> resets on <span className="text-foreground font-bold">{shortDate(calc.cycleEnd)}</span>
                  </p>
                  
                  <div className="mt-8 grid grid-cols-3 gap-3 md:gap-6 border-t border-border pt-6">
                    <div className="flex flex-col gap-1">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Balance</p>
                      <p className="text-[18px] md:text-[22px] font-black text-foreground tnum">{rupees(calc.remaining * 100)}</p>
                    </div>
                    <div className="flex flex-col gap-1 border-l border-border pl-4 md:pl-6">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Safe Limit</p>
                      <p className="text-[18px] md:text-[22px] font-black text-foreground tnum">{rupees(calc.safeDailyLimit * 100)}</p>
                    </div>
                    <div className="flex flex-col gap-1 border-l border-border pl-4 md:pl-6">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Today</p>
                      <p className="text-[18px] md:text-[22px] font-black text-foreground tnum">{rupees(calc.spentToday * 100)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <Progress id="progress-runway" value={calc.pct} className="h-1 bg-surface-raised" />
                    <div className="mt-3 text-[11px] text-muted-foreground flex items-center justify-between font-medium">
                      {profile?.companion_paired ? (
                        <span className="flex items-center gap-1.5 text-zinc-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                          Auto-tracking active via {profile.companion_device_name ?? "companion"}
                        </span>
                      ) : (
                        <Link to="/companion" className="text-warning flex items-center gap-1.5 hover:underline">
                          <span className="w-1.5 h-1.5 bg-warning rounded-full"/> Manual tracking mode
                        </Link>
                      )}
                      <span className="font-bold text-foreground">{calc.pct}% Spent</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Active Pools */}
          <section id="section-active-pools" className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold tracking-[0.25em] text-zinc-500 uppercase">
                Active Wing Pools
              </h3>
              <Link
                to="/pool"
                id="btn-new-pool-dash"
                className="text-[10px] font-bold text-foreground bg-surface-raised border border-border hover:bg-surface-interactive transition-all px-3.5 py-1.5 rounded-full uppercase tracking-wider cursor-pointer"
              >
                + New Pool
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(pools ?? []).filter((p) => p.status === "open" && new Date(p.expires_at).getTime() > Date.now()).length === 0 && (
                <div className="col-span-full py-10 text-center border border-dashed border-border rounded-2xl bg-surface-raised/40">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">No active pools in your wing.</p>
                  <p className="text-[11px] text-zinc-500 mt-1">Start one now to split quick commerce delivery fees.</p>
                </div>
              )}
              {(pools ?? [])
                .filter((p) => p.status === "open" && new Date(p.expires_at).getTime() > Date.now())
                .map((p) => {
                const total = (p.items ?? []).reduce((s: number, i: any) => s + i.estimated_price, 0);
                const minsLeft = Math.max(
                  0,
                  Math.round((new Date(p.expires_at).getTime() - Date.now()) / 60000),
                );
                const perPerson = (p.items ?? []).length
                  ? Math.round(
                      p.delivery_fee / new Set((p.items ?? []).map((i: any) => i.added_by_name)).size,
                    )
                  : 0;
                return (
                  <Link key={p.id} to="/pool/$id" params={{ id: p.id }} className="group">
                    <Card className="bg-surface relative overflow-hidden border border-border p-5 transition-all duration-300 hover:border-white/15 hover:bg-surface-raised h-full flex flex-col justify-between hover:shadow-lg hover:shadow-black/40">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-foreground">
                              {p.platform.replace("_", " ")}
                            </span>
                            <Badge variant="outline" className="text-muted-foreground bg-white/5 border-border text-[9px] font-bold">
                              {p.wing_label}
                            </Badge>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-border bg-background tnum ${minsLeft < 5 ? "text-destructive animate-pulse border-destructive/20 bg-destructive/5" : "text-foreground"}`}
                          >
                            {minsLeft}m left
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Host: <span className="font-semibold text-foreground capitalize">{p.created_by_name || "—"}</span>
                        </p>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Cart</span>
                          <span className="text-xs font-black text-foreground">{rupees(total)} <span className="text-zinc-500 font-normal text-[10px]">/ {rupees(p.min_cart_value)} min</span></span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Split Est.</span>
                          <span className="text-xs font-black text-success">{rupees(perPerson)} <span className="text-zinc-500 font-normal text-[10px]">/ person</span></span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Sidebar Column (Alerts, Collisions, Recent) */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6">
          
          {/* Alert Widget */}
          {calc && (calc.runwayDays < 7 || calc.safeDailyLimit < 150) && (
            <Card
              id="card-runway-alert"
              className="border-destructive/30 bg-destructive/5 p-5 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-[3px] h-full bg-destructive" />
              <div className="flex items-center gap-2 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                <p className="text-[10px] font-bold text-destructive tracking-widest uppercase">Runway Warning</p>
              </div>
              <p className="text-xs font-medium text-foreground leading-relaxed">
                Daily limit is <span className="text-destructive font-bold">{rupees(calc.safeDailyLimit * 100)}</span>. Skip delivery orders tonight.
              </p>
              {bestFood && (
                <div className="mt-4 rounded-lg border border-success/20 bg-success/5 p-3.5 space-y-1">
                  <p className="text-[9px] font-bold tracking-widest text-success uppercase">Dine In Option</p>
                  <p className="text-xs text-foreground leading-relaxed">
                    <span className="font-bold text-foreground">{bestFood.venue_name}</span> has{" "}
                    <span className="font-semibold text-foreground">{bestFood.item_name}</span> for{" "}
                    <strong className="text-success">{rupees(bestFood.price)}</strong>.
                  </p>
                </div>
              )}
              <button
                onClick={() => setShowFoodSheet(true)}
                className="mt-3 text-[11px] font-bold text-foreground hover:underline uppercase tracking-wider cursor-pointer"
              >
                All Campus Foods →
              </button>
            </Card>
          )}

          {/* Collisions */}
          {collisions.length > 0 && (
            <section id="section-collisions" className="space-y-3">
              <h3 className="text-[10px] font-bold tracking-[0.25em] text-zinc-500 uppercase px-1">
                Budget Collisions
              </h3>
              <div className="space-y-3">
                {collisions.length > 1 && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-[11px]">
                    <p className="font-bold tracking-wider text-[9px] text-destructive uppercase mb-1">
                      Cumulative Debit Impact
                    </p>
                    <p className="font-medium text-zinc-400 leading-relaxed">
                      If all {collisions.length} debits hit this week, your safe limit drops to <strong className="text-foreground">{rupees(cumulativeCollisionLimit * 100)}</strong>/day.
                    </p>
                  </div>
                )}
                {collisions.map((c) => (
                  <Card
                    key={c.id}
                    className={`bg-surface border-border p-4 relative overflow-hidden ${c.critical ? "border-l-2 border-l-destructive" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-bold text-foreground flex items-center">
                        {c.service_name ?? c.name}
                        {c.detected_from === "auto_detected" && (
                          <Badge className="ml-2 bg-white/5 border border-border text-[9px] font-bold px-1.5 py-0">
                            Auto
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs font-bold text-destructive tnum">
                        −{rupees(c.amount)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <p className="text-zinc-500 font-semibold">{shortDate(new Date(c.next_debit_date))}</p>
                      <p className="text-zinc-500">
                        Limit: <span className="text-foreground font-bold">{rupees(c.newLimit * 100)}</span>
                        {c.critical && (
                          <span className="ml-1.5 text-destructive font-bold">⚠</span>
                        )}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Recent */}
          <section id="section-recent" className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold tracking-[0.25em] text-zinc-500 uppercase">
                Recent Ledger
              </h3>
              <Link
                to="/transactions"
                id="link-see-all-txns"
                className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                See all →
              </Link>
            </div>
            <Card className="bg-surface border-border p-1 overflow-hidden">
              {!txns ? (
                <div className="p-4"><Skeleton className="h-32 w-full bg-white/5 border-none" /></div>
              ) : recent.length === 0 ? (
                <p className="py-8 text-center text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  No transactions logged
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {recent.map((t, i) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3.5 hover:bg-surface-raised transition-colors duration-150"
                      style={{ animation: `pb-stagger 300ms ${i * 40}ms backwards ease-out` }}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p
                          className={`text-xs font-bold truncate ${t.is_mapped ? "text-foreground" : "text-zinc-400 italic"}`}
                        >
                          {t.mapped_merchant_name ?? t.raw_merchant_string}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {t.category && (
                            <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">
                              {t.category}
                            </span>
                          )}
                          {t.source !== "manual" && (
                            <>
                              <span className="text-[9px] text-zinc-600 font-bold">•</span>
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">
                                {t.source.split("_")[1]}
                              </span>
                            </>
                          )}
                          {!t.is_mapped && (
                            <button
                              id={`btn-identify-${t.id}`}
                              onClick={() => setIdentifying(t)}
                              className="ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold bg-white/5 border border-border hover:bg-white/10 hover:border-white/15 transition-all cursor-pointer uppercase text-foreground"
                            >
                              Identify?
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-black text-foreground tnum">{rupees(t.amount)}</p>
                        <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                          {relativeTime(t.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-3">
                <Button
                  id="btn-add-transaction"
                  variant="secondary"
                  className="w-full text-[10px] uppercase tracking-wider font-bold h-9 bg-surface-raised hover:bg-surface-interactive border-border"
                  onClick={() => setAdding(true)}
                >
                  Log Transaction
                </Button>
              </div>
            </Card>
          </section>

        </div>
      </div>

      <style>{`@keyframes pb-stagger { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Identify dialog */}
      <Dialog open={!!identifying} onOpenChange={(o) => !o && setIdentifying(null)}>
        <DialogContent id="dialog-merchant-mapping">
          {identifying && (
            <IdentifyForm
              txn={identifying}
              onClose={() => {
                setIdentifying(null);
                qc.invalidateQueries();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add txn */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent id="dialog-add-transaction">
          <AddTxnForm
            onClose={() => {
              setAdding(false);
              qc.invalidateQueries();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Food options */}
      <Sheet open={showFoodSheet} onOpenChange={setShowFoodSheet}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-auto">
          <SheetHeader>
            <SheetTitle>Campus Food Options</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {Object.entries(
              ((foods ?? []) as Food[]).reduce<Record<string, Food[]>>((acc, f) => {
                (acc[f.venue_name] ??= []).push(f);
                return acc;
              }, {}),
            ).map(([venue, items]) => (
              <div key={venue}>
                <h4 className="text-[12px] font-semibold text-muted-foreground">{venue}</h4>
                <div className="mt-1 space-y-1">
                  {items.map((it) => {
                    const open = isTimeInRange(new Date(), it.available_from, it.available_until);
                    return (
                      <div
                        key={it.id}
                        className="flex items-center justify-between rounded bg-surface p-2"
                      >
                        <div>
                          <p className="text-sm">{it.item_name}</p>
                          <p
                            className={`text-[11px] ${open ? "text-success" : "text-muted-foreground"}`}
                          >
                            {open ? "Open Now" : `Opens at ${fmtTime(it.available_from)}`}
                          </p>
                        </div>
                        <span className="tnum text-sm font-semibold">{rupees(it.price)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Check-in dialog */}
      <Dialog
        open={showCheckIn}
        onOpenChange={() => {
          /* not dismissible */
        }}
      >
        <DialogContent
          id="dialog-checkin"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Hey, it's been a while since your last meal.</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">It's exam season. Quick check:</p>
          <p className="text-[12px] text-warning">
            Last food transaction was {Math.round(foodGapHours)} hours ago
          </p>
          <div className="mt-3 space-y-2">
            <button
              id="btn-checkin-ate"
              onClick={handleCheckInAte}
              className="w-full rounded-md border-l-4 border-l-success bg-surface p-3 text-left text-[13px]"
            >
              I ate at mess / cooked / ordered in
            </button>
            <div className="rounded-md border-l-4 border-l-destructive bg-surface p-3">
              <button
                id="btn-checkin-skipped"
                onClick={() => setCheckInExpanded(true)}
                className="w-full text-left text-[13px]"
              >
                Skipped / couldn't eat
              </button>
              {checkInExpanded && (
                <div className="mt-2 space-y-2">
                  <p className="text-[12px] text-muted-foreground">What happened?</p>
                  <Input
                    id="input-checkin-note"
                    value={stressNote}
                    onChange={(e) => setStressNote(e.target.value)}
                    placeholder="e.g., was studying, mess closed, no money"
                  />
                  <Button
                    variant="outline"
                    className="w-full border-destructive text-destructive"
                    onClick={handleCheckInSkipped}
                  >
                    Submit
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </AppShell>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] tnum">
      {children}
    </span>
  );
}

function IdentifyForm({ txn, onClose }: { txn: Txn; onClose: () => void }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState<string>("food");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!name) {
      toast.error("Enter shop name");
      return;
    }
    setBusy(true);
    try {
      await identifyMerchant({
        data: {
          txn_id: txn.id,
          raw_merchant_string: txn.raw_merchant_string,
          display_name: name,
          category: cat,
        },
      });
      toast.success("Mapped! This helps everyone on campus.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to identify merchant");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>What is this shop?</DialogTitle>
      </DialogHeader>
      <code className="block rounded bg-surface-raised px-3 py-1.5 text-xs">
        {txn.raw_merchant_string}
      </code>
      <div>
        <label className="text-[12px] text-muted-foreground">Shop name on campus</label>
        <Input
          id="input-map-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Hostel 1 Night Canteen"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.v}
            onClick={() => setCat(c.v)}
            className={`rounded-md border p-3 text-center text-sm ${cat === c.v ? "border-primary bg-primary/10" : "border-border bg-surface"}`}
          >
            {c.l}
          </button>
        ))}
      </div>
      <DialogFooter>
        <Button
          id="btn-save-merchant"
          disabled={busy}
          onClick={save}
          className="w-full bg-success text-white hover:bg-success/90"
        >
          Save for everyone on campus
        </Button>
      </DialogFooter>
    </>
  );
}

function AddTxnForm({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [cat, setCat] = useState<string>("food");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!amount || !merchant) {
      toast.error("Fill all fields");
      return;
    }
    setBusy(true);
    try {
      await insertTransaction({
        data: {
          amount: Math.round(parseFloat(amount) * 100),
          raw_merchant_string: merchant,
          mapped_merchant_name: merchant,
          category: cat,
          source: "manual",
        },
      });
      toast.success("Transaction logged.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to log transaction");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>Log a transaction</DialogTitle>
      </DialogHeader>
      <div className="flex items-center rounded-md border border-input bg-surface">
        <span className="px-3 text-sm text-muted-foreground">₹</span>
        <input
          id="input-txn-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-transparent py-2 pr-3 text-sm outline-none"
          placeholder="Amount"
        />
      </div>
      <Input
        id="input-txn-merchant"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        placeholder="BH-2 Night Canteen"
      />
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.v}
            onClick={() => setCat(c.v)}
            className={`rounded-md border p-3 text-center text-sm ${cat === c.v ? "border-primary bg-primary/10" : "border-border bg-surface"}`}
          >
            {c.l}
          </button>
        ))}
      </div>
      <DialogFooter>
        <Button id="btn-submit-txn" disabled={busy} onClick={save} className="w-full">
          Add
        </Button>
      </DialogFooter>
    </>
  );
}
