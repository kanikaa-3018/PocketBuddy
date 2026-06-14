import { type ReactNode } from "react";
import { TopNav } from "./TopNav";

export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col font-sans selection:bg-accent-bronze/25 selection:text-foreground">
      {!hideNav && <TopNav />}
      <main className="flex-1 w-full pt-[72px] px-4 md:px-8">
        {children}
      </main>
    </div>
  );
}
