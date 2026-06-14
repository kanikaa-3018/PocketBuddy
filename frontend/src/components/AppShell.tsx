import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  List, 
  ShoppingCart, 
  Settings, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Plus
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, id: "nav-dashboard" },
  { to: "/transactions", label: "History", icon: List, id: "nav-transactions" },
  { to: "/pool", label: "Pool", icon: ShoppingCart, id: "nav-pool" },
  { to: "/settings", label: "Settings", icon: Settings, id: "nav-settings" },
] as const;

export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  // Sidebar collapse state (desktop)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pocketbuddy_sidebar_collapsed") === "true";
    }
    return false;
  });

  // Mobile menu open state
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("pocketbuddy_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  // Close mobile menu on navigate
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (hideNav) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col font-sans selection:bg-accent-bronze/25 selection:text-foreground">
        <main className="flex-1 w-full px-4 md:px-8 py-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col md:flex-row font-sans selection:bg-accent-bronze/25 selection:text-foreground">
      
      {/* ── 1. Desktop Sidebar ─────────────────────────────────────────── */}
      <aside 
        className={`hidden md:flex flex-col fixed left-4 top-4 bottom-4 z-50 border border-border bg-surface/80 backdrop-blur-xl rounded-2xl p-4 transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.6)] ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-between mb-8 px-2">
          {!collapsed ? (
            <Link to="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-90">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-bronze to-accent-amber flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] shrink-0">
                <span className="text-[#0A0A0A] font-black text-sm leading-none tracking-tighter">P</span>
              </div>
              <span className="font-black text-sm tracking-tight text-foreground uppercase">
                PocketBuddy
              </span>
            </Link>
          ) : (
            <Link to="/dashboard" className="mx-auto">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-bronze to-accent-amber flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <span className="text-[#0A0A0A] font-black text-sm leading-none tracking-tighter">P</span>
              </div>
            </Link>
          )}

          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex items-center justify-center w-6 h-6 rounded-full border border-border hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Action Button: Log Txn */}
        {user && (
          <div className="mb-6 px-1">
            {!collapsed ? (
              <Link 
                to="/dashboard?log=true" 
                className="flex items-center justify-center gap-2 h-10 w-full rounded-xl bg-foreground text-background text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>Log Transaction</span>
              </Link>
            ) : (
              <Link 
                to="/dashboard?log=true" 
                title="Log Transaction"
                className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-foreground text-background transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
              >
                <Plus className="h-5 w-5 stroke-[3]" />
              </Link>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex-1 space-y-1.5 px-1">
          {tabs.map((t) => {
            const active = pathname === t.to || pathname.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                id={t.id}
                title={collapsed ? t.label : undefined}
                className={`relative flex items-center gap-3 rounded-xl p-3 text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                  active
                    ? "text-foreground bg-white/5 border border-border shadow-inner"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {!collapsed && <span>{t.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        {user && (
          <div className="border-t border-border pt-4 px-1 mt-auto">
            {!collapsed ? (
              <Link to="/settings" className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-xl transition-all">
                <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center border border-border shadow-inner shrink-0">
                  <span className="text-xs text-foreground font-bold">
                    {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-foreground truncate">{user.fullName || "User"}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{user.email || ""}</p>
                </div>
              </Link>
            ) : (
              <Link to="/settings" title="Settings" className="flex justify-center py-2">
                <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center border border-border shadow-inner">
                  <span className="text-xs text-foreground font-bold">
                    {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </span>
                </div>
              </Link>
            )}
          </div>
        )}
      </aside>

      {/* ── 2. Mobile Top Header ───────────────────────────────────────── */}
      <header className="flex md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-md items-center justify-between px-4 z-50">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-bronze to-accent-amber flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <span className="text-[#0A0A0A] font-black text-sm leading-none tracking-tighter">P</span>
          </div>
          <span className="font-black text-sm tracking-tight text-foreground uppercase">
            PocketBuddy
          </span>
        </Link>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-raised border border-border text-foreground hover:bg-surface-interactive transition-colors cursor-pointer"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* ── 3. Mobile Navigation Drawer ─────────────────────────────────── */}
      <div 
        className={`md:hidden fixed inset-0 bg-background/95 z-40 transition-transform duration-300 pt-20 px-6 flex flex-col ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Action Button */}
        {user && (
          <div className="mb-6">
            <Link 
              to="/dashboard?log=true" 
              className="flex items-center justify-center gap-2 h-12 w-full rounded-xl bg-foreground text-background text-sm font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              <Plus className="h-5 w-5 stroke-[3]" />
              <span>Log Transaction</span>
            </Link>
          </div>
        )}

        {/* Tabs */}
        <nav className="space-y-2.5">
          {tabs.map((t) => {
            const active = pathname === t.to || pathname.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                id={t.id}
                className={`flex items-center gap-4 rounded-xl p-4 text-sm font-bold uppercase tracking-widest transition-all ${
                  active
                    ? "text-foreground bg-white/5 border border-border shadow-inner"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile at the bottom of drawer */}
        {user && (
          <div className="border-t border-border pt-6 mt-auto mb-8">
            <Link to="/settings" className="flex items-center gap-4 p-2 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center border border-border shadow-inner">
                <span className="text-sm text-foreground font-bold">
                  {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{user.fullName || "User"}</p>
                <p className="text-[10px] text-muted-foreground">{user.email || ""}</p>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* ── 4. Main Content ────────────────────────────────────────────── */}
      <main 
        className={`flex-1 w-full min-w-0 transition-all duration-300 px-4 md:px-8 pb-8 ${
          collapsed ? "md:pl-28" : "md:pl-72"
        } pt-20 md:pt-6`}
      >
        {children}
      </main>

    </div>
  );
}
