import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { AppShell, MobileMenuButton } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { rupees } from "@/lib/format";
import { Clock } from "lucide-react";
import { getProfile, getCartPools, insertCartPool } from "@/lib/api/db.functions";

export const Route = createFileRoute("/_authenticated/pool/")({
  ssr: false,
  component: PoolList,
});

type Pool = any;

const PLATFORMS = [
  { v: "blinkit" as const, l: "Blinkit" },
  { v: "zepto" as const, l: "Zepto" },
  { v: "swiggy_instamart" as const, l: "Swiggy Instamart" },
];

const BRAND_THEMES: Record<string, { bg: string; text: string; name: string; gradient: string; accent: string }> = {
  zepto: {
    bg: "bg-[#5E17EB]",
    text: "text-white",
    name: "Zepto",
    gradient: "from-[#5E17EB] to-[#FF5E00]",
    accent: "text-[#FF5E00]"
  },
  blinkit: {
    bg: "bg-[#F7EC13]",
    text: "text-black",
    name: "Blinkit",
    gradient: "from-[#F7EC13] to-[#14B8A6]",
    accent: "text-[#14B8A6]"
  },
  swiggy_instamart: {
    bg: "bg-[#FC8019]",
    text: "text-white",
    name: "Swiggy Instamart",
    gradient: "from-[#FC8019] to-[#EF4444]",
    accent: "text-[#FC8019]"
  }
};

function PoolList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => getProfile(),
  });

  const { data: pools } = useQuery({
    queryKey: ["all-pools", profile?.wing_label],
    enabled: !!profile?.wing_label,
    queryFn: () => getCartPools(),
  });

  const now = Date.now();
  const active = (pools ?? []).filter(
    (p) => p.status === "open" && new Date(p.expires_at).getTime() > now,
  );
  const past = (pools ?? []).filter((p) => !active.includes(p));

  return (
    <AppShell>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 backdrop-blur-md">
        <MobileMenuButton />
        <h1 className="text-lg font-black tracking-wider text-foreground uppercase">Cart Pools</h1>
      </div>
      <div className="space-y-6 py-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              id="card-create-pool"
              className="w-full rounded-xl border border-dashed border-primary/30 hover:border-primary/60 bg-surface/50 p-6 text-center transition-all duration-200 hover:bg-surface-raised active:scale-[0.98] cursor-pointer shadow-sm hover:shadow-lg hover:shadow-black/20"
            >
              <p className="text-xs font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
                + Start a New Cart Pool
              </p>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-auto" id="sheet-create-pool">
            <CreatePoolForm
              userId={user?.id}
              userName={profile?.full_name ?? "You"}
              wing={profile?.wing_label ?? "Wing 4B"}
              onDone={() => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ["all-pools"] });
                qc.invalidateQueries({ queryKey: ["pools"] });
              }}
            />
          </SheetContent>
        </Sheet>

        <section className="space-y-3">
          <h3 className="text-xs font-bold tracking-[0.25em] text-zinc-500 uppercase px-1">
            Active Pools
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {active.length === 0 && (
              <div className="col-span-full py-10 text-center border border-dashed border-border rounded-xl bg-surface-raised/40">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">No active pools.</p>
              </div>
            )}
            {active.map((p) => (
              <PoolCard key={p.id} pool={p} />
            ))}
          </div>
        </section>

        {past.length > 0 && (
          <details className="group pt-2">
            <summary className="cursor-pointer text-xs font-bold tracking-[0.25em] text-zinc-500 uppercase list-none flex items-center gap-1 hover:text-foreground transition-colors select-none">
              <span className="transition-transform group-open:rotate-90">▶</span>
              Past Pools ({past.length})
            </summary>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-65 group-open:animate-[fadeIn_0.2s_ease-out]">
              {past.map((p) => (
                <PoolCard key={p.id} pool={p} />
              ))}
            </div>
          </details>
        )}
      </div>
    </AppShell>
  );
}

function PoolCard({ pool }: { pool: Pool }) {
  const minsLeft = Math.max(
    0,
    Math.round((new Date(pool.expires_at).getTime() - Date.now()) / 60000),
  );

  const theme = BRAND_THEMES[pool.platform] || {
    bg: "bg-primary",
    text: "text-primary-foreground",
    name: pool.platform,
    gradient: "from-primary to-accent",
    accent: "text-primary"
  };

  const active = minsLeft > 0 && pool.status === "open";
  
  // Platform color mapping for left border highlight
  const platformBorderColor = 
    pool.platform === "zepto" 
      ? "border-l-[#5E17EB]" 
      : pool.platform === "blinkit" 
        ? "border-l-[#F7EC13]" 
        : pool.platform === "swiggy_instamart" 
          ? "border-l-[#FC8019]" 
          : "border-l-primary";

  return (
    <Link to="/pool/$id" params={{ id: pool.id }} className="block no-underline">
      <Card className={`relative overflow-hidden p-5 border border-border border-l-4 ${platformBorderColor} bg-surface transition-all duration-200 hover:bg-surface-raised hover:border-r-white/10 hover:border-t-white/10 hover:border-b-white/10 hover:shadow-lg hover:shadow-black/50 active:scale-[0.99]`}>
        {active && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center gap-1.5 bg-white/5 border border-border px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Open
            </span>
          </div>
        )}

        <div className="flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider text-foreground">
                {theme.name} Pool
              </span>
              <Badge variant="outline" className="text-xs font-bold border-border bg-white/5 text-muted-foreground">
                {pool.wing_label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Host: <span className="font-semibold text-foreground capitalize">{pool.created_by_name || "—"}</span>
            </p>
          </div>

          <div className="mt-5 flex justify-between items-end border-t border-border pt-3">
            <div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                Min Cart Target
              </p>
              <p className="text-sm font-black text-foreground tnum mt-0.5">
                {rupees(pool.min_cart_value)}
              </p>
            </div>
            <div className="text-right">
              {active ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/5 border border-border px-3 py-1 rounded-full text-foreground tnum">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>{minsLeft}m left</span>
                </span>
              ) : (
                <Badge className={`text-xs font-bold uppercase tracking-wider ${
                  pool.status === "completed"
                    ? "bg-green-600/15 border border-green-600/30 text-green-500"
                    : pool.status === "cancelled"
                    ? "bg-red-600/15 border border-red-600/30 text-red-500"
                    : "bg-surface-raised text-muted-foreground"
                }`}>
                  {pool.status}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function CreatePoolForm({
  userId,
  userName,
  wing,
  onDone,
}: {
  userId: string | undefined;
  userName: string;
  wing: string;
  onDone: () => void;
}) {
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["v"]>("zepto");
  const [minCart, setMinCart] = useState("199");
  const [fee, setFee] = useState("25");
  const [dur, setDur] = useState("30");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!userId) return;
    setBusy(true);
    try {
      const expires = new Date(Date.now() + parseInt(dur, 10) * 60_000).toISOString();
      const data = await insertCartPool({
        data: {
          created_by_name: userName || "You",
          wing_label: wing,
          platform,
          min_cart_value: Math.round(parseFloat(minCart) * 100),
          delivery_fee: Math.round(parseFloat(fee) * 100),
          expires_at: expires,
        },
      });
      toast.success("Pool created! Share with your wing.");
      if (data && navigator.share) {
        navigator
          .share({
            title: "Join my cart pool",
            text: `Join my ${platform} pool on PocketBuddy!`,
            url: `${window.location.origin}/pool/${data.id}`,
          })
          .catch(() => {});
      }
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Failed to create pool");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>New Cart Pool</SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.v}
              onClick={() => setPlatform(p.v)}
              className={`rounded-md border p-3 text-center text-sm ${platform === p.v ? "border-primary bg-primary/10" : "border-border bg-surface"}`}
            >
              {p.l}
            </button>
          ))}
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Min cart value</label>
          <div className="mt-1 flex items-center rounded-md border border-input bg-surface">
            <span className="px-3 text-sm text-muted-foreground">₹</span>
            <input
              id="input-pool-min"
              type="number"
              value={minCart}
              onChange={(e) => setMinCart(e.target.value)}
              className="flex-1 bg-transparent py-2 pr-3 text-sm outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Delivery fee</label>
          <div className="mt-1 flex items-center rounded-md border border-input bg-surface">
            <span className="px-3 text-sm text-muted-foreground">₹</span>
            <input
              id="input-pool-fee"
              type="number"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="flex-1 bg-transparent py-2 pr-3 text-sm outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Duration</label>
          <Select value={dur} onValueChange={setDur}>
            <SelectTrigger id="select-pool-duration" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="45">45 min</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          id="btn-create-pool"
          onClick={create}
          disabled={busy}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Create & Share
        </Button>
      </div>
    </>
  );
}
