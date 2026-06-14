import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { AppShell, MobileMenuButton } from "@/components/AppShell";
import { Smartphone, Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rupees, relativeTime, absoluteDate, getCycleStart } from "@/lib/format";
import { getProfile, getTransactions } from "@/lib/api/db.functions";

export const Route = createFileRoute("/_authenticated/transactions")({
  ssr: false,
  component: TxnsPage,
});

type Txn = any;
type Cat = "all" | "food" | "stationery" | "travel" | "subscription" | "other" | "unmapped";
type Source = "all" | "companion" | "manual";
type Range = "cycle" | "7" | "30" | "all";

const CAT_FILTERS: { v: Cat; l: string }[] = [
  { v: "all", l: "All" },
  { v: "food", l: "Food" },
  { v: "stationery", l: "Stationery" },
  { v: "travel", l: "Travel" },
  { v: "subscription", l: "Subscription" },
  { v: "other", l: "Other" },
  { v: "unmapped", l: "Unmapped" },
];

function TxnsPage() {
  const { user } = useAuth();
  const [cat, setCat] = useState<Cat>("all");
  const [src, setSrc] = useState<Source>("all");
  const [range, setRange] = useState<Range>("cycle");
  const [limit, setLimit] = useState(20);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => getProfile(),
  });

  const { data: txns, isLoading } = useQuery({
    queryKey: ["txns", user?.id],
    enabled: !!user,
    queryFn: () => getTransactions(),
  });

  const filtered = useMemo(() => {
    if (!txns) return [];
    let out = txns;
    const now = new Date();
    if (range === "cycle" && profile?.cycle_start_day) {
      const start = getCycleStart(profile.cycle_start_day);
      out = out.filter((t) => new Date(t.created_at) >= start);
    } else if (range === "7") {
      const c = new Date(now);
      c.setDate(c.getDate() - 7);
      out = out.filter((t) => new Date(t.created_at) >= c);
    } else if (range === "30") {
      const c = new Date(now);
      c.setDate(c.getDate() - 30);
      out = out.filter((t) => new Date(t.created_at) >= c);
    }
    if (cat === "unmapped") out = out.filter((t) => !t.is_mapped);
    else if (cat !== "all") out = out.filter((t) => t.category === cat);
    if (src === "companion") out = out.filter((t) => t.source.startsWith("companion"));
    else if (src === "manual") out = out.filter((t) => t.source === "manual");
    return out;
  }, [txns, cat, src, range, profile]);

  const visible = filtered.slice(0, limit);
  const total = filtered.reduce((s, t) => s + t.amount, 0);

  return (
    <AppShell>
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md pb-4 pt-2">
        <div className="flex h-14 items-center gap-3 mb-2">
          <MobileMenuButton />
          <h1 className="text-lg font-black tracking-wider text-foreground uppercase">Transaction History</h1>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-3 no-scrollbar">
          {CAT_FILTERS.map((c) => (
            <button
              key={c.v}
              id={`filter-txn-${c.v}`}
              onClick={() => setCat(c.v)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs uppercase tracking-wider font-bold transition-all border cursor-pointer ${cat === c.v ? "bg-primary border-primary text-primary-foreground" : "bg-surface-raised border-border text-muted-foreground hover:text-foreground hover:bg-surface-interactive"}`}
            >
              {c.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-1">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Source:</span>
          {(["all", "companion", "manual"] as const).map((s) => (
            <button
              key={s}
              id={`filter-source-${s}`}
              onClick={() => setSrc(s)}
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${src === s ? "bg-primary border-primary text-primary-foreground" : "bg-surface-raised border-border text-muted-foreground hover:text-foreground"}`}
            >
              {s === "companion" ? "Companion" : s === "manual" ? "Manual" : "All"}
            </button>
          ))}
          <div className="ml-auto">
            <Select value={range} onValueChange={(v) => setRange(v as Range)}>
              <SelectTrigger id="select-txn-range" className="h-7 text-xs font-bold uppercase tracking-wider bg-surface border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cycle">This Cycle</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="py-6 pb-32 space-y-1.5">
        {isLoading && <Skeleton className="h-40 w-full bg-white/5 border-none" />}
        {!isLoading && visible.length === 0 && (
          <p className="py-12 text-center text-xs text-zinc-500 font-semibold uppercase tracking-wider">
            No transactions found.
          </p>
        )}

        {!isLoading && visible.length > 0 && (
          <div className="border border-border bg-surface rounded-2xl overflow-hidden divide-y divide-border">
            {visible.map((t) => {
              const isCompanion = t.source.startsWith("companion");
              const notificationPreview = t.notification_preview;
              return (
                <div key={t.id} className="p-4 transition-colors hover:bg-surface-raised/60">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${t.is_mapped ? "text-foreground" : "italic text-warning/90"}`}
                      >
                        <span className="inline-flex items-center mr-2 align-middle text-zinc-500">
                          {isCompanion ? <Smartphone className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                        </span>
                        {t.mapped_merchant_name ?? t.raw_merchant_string}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {t.category && (
                          <Badge
                            variant="outline"
                            className="text-xs font-black tracking-widest text-zinc-500 uppercase py-0 px-2 bg-white/5 border-border"
                          >
                            {t.category}
                          </Badge>
                        )}
                        {isCompanion && notificationPreview && (
                          <button
                            onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                            className="text-xs font-bold text-primary hover:text-primary/85 transition-colors uppercase tracking-wider cursor-pointer"
                          >
                            {expanded === t.id ? "Hide preview" : "Show preview"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-foreground tnum">{rupees(t.amount)}</p>
                      <p className="text-xs text-zinc-500 font-semibold mt-0.5">{relativeTime(t.created_at)}</p>
                      <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-wide mt-0.5">{absoluteDate(t.created_at)}</p>
                    </div>
                  </div>
                  {expanded === t.id && notificationPreview && (
                    <pre className="mt-3 rounded-lg bg-background border border-border p-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap select-all shadow-inner">
                      {notificationPreview}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > visible.length && (
          <button
            onClick={() => setLimit((l) => l + 20)}
            className="mt-4 w-full rounded-md py-2.5 text-xs font-bold uppercase tracking-wider bg-surface-raised border border-border text-foreground hover:bg-surface-interactive hover:border-white/15 transition-all cursor-pointer"
          >
            Load more
          </button>
        )}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface/85 backdrop-blur-md px-5 py-2.5 rounded-full border border-border shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex items-center justify-between gap-6 whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground animate-[fadeIn_0.3s_ease-out]">
        <span>Showing: <strong className="text-foreground">{visible.length}</strong> txns</span>
        <span className="w-[1px] h-3 bg-border" />
        <span>Total: <strong className="text-foreground">{rupees(total)}</strong></span>
      </div>
    </AppShell>
  );
}
