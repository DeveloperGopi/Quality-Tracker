/**
 * ADMIN TAB BAR — one opaque, full-width sticky bar shared by every Admin tab.
 *
 * The wrapper is solid `bg-background` (no blur/transparency), sits directly
 * under the AppShell header, and measures its own height so the Pending rules
 * toolbar can stick beneath it. On phones the tab list scrolls sideways.
 */

import { useEffect, useRef } from "react";

import { ADMIN_TABS, type AdminTabId } from "@/lib/adminSettings";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function AdminTabBar({
  needsAttention,
}: {
  needsAttention: (id: AdminTabId) => string | null;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty(
        "--admin-tabbar-h",
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    window.addEventListener("resize", apply, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="sticky z-30 -mx-4 -mt-4 overflow-x-auto border-b border-border/60 bg-background px-4 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.55)] md:-mx-6 md:px-6"
      style={{ top: "var(--app-header-h, 4rem)" }}
      data-testid="admin-tab-bar"
    >
      <TabsList className="h-auto w-max min-w-full justify-start gap-1 rounded-none bg-background p-1">
        {ADMIN_TABS.map((tab) => {
          const badge = needsAttention(tab.id);
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              data-guide-target={`admin-tab-${tab.id}`}
              className="min-h-11 shrink-0 gap-2 rounded-lg px-4 text-sm font-medium data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              <Icon className="size-4" />
              {tab.label}
              {badge && (
                <span
                  className={cn(
                    "ml-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                    tab.id === "workspace" || tab.id === "pages"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-amber-300/70 bg-amber-100 text-amber-900",
                  )}
                >
                  {badge}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}
