import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, List, ShoppingCart, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, id: "nav-dashboard" },
  { to: "/transactions", label: "History", icon: List, id: "nav-transactions" },
  { to: "/pool", label: "Pool", icon: ShoppingCart, id: "nav-pool" },
  { to: "/settings", label: "Settings", icon: Settings, id: "nav-settings" },
] as const;

export function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  return (
    <div className="sticky top-4 z-50 w-full px-4 md:px-8 pointer-events-none">
      <nav className="flex h-14 items-center justify-between rounded-full border border-border bg-surface/75 px-4 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] pointer-events-auto">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-bronze to-accent-amber flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <span className="text-[#0A0A0A] font-black text-sm leading-none tracking-tighter">P</span>
            </div>
            <span className="font-black text-sm tracking-tight hidden sm:block text-foreground uppercase">
              PocketBuddy
            </span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-1">
            {tabs.map((t) => {
              const active = pathname === t.to || pathname.startsWith(t.to + "/");
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  id={t.id}
                  className={`relative flex items-center justify-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                    active
                      ? "text-foreground bg-white/5 border border-border shadow-inner"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mobile tabs */}
          <div className="flex md:hidden items-center space-x-1 mr-2">
            {tabs.map((t) => {
              const active = pathname === t.to || pathname.startsWith(t.to + "/");
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  id={t.id}
                  className={`flex items-center justify-center p-2 rounded-full transition-all duration-150 ${
                    active
                      ? "text-foreground bg-white/5 border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </div>

          {user && (
            <>
              <Link 
                to="/dashboard" 
                className="hidden sm:flex items-center justify-center h-8 px-4 rounded-full bg-foreground text-background text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md"
              >
                Log Txn
              </Link>
              <Link to="/settings" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center border border-border shadow-inner">
                  <span className="text-xs text-foreground font-bold">
                    {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </span>
                </div>
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
