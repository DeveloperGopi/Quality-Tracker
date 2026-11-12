import { cn } from "@/lib/utils";

/** Certification-cycle ("Cert_Cycle") chip — renders the same way on every
 *  page (master list, quick views, dashboard tables, profile) so a "#2 NQAS"
 *  vs "#1 Kayakalp" distinction is readable at a glance without reading the
 *  adjacent columns. */

const CYCLE_TYPE_STYLES: Record<string, string> = {
  nqas: "bg-sky-100 text-sky-800 ring-sky-600/30",
  kayakalp: "bg-emerald-100 text-emerald-800 ring-emerald-600/30",
  kk: "bg-emerald-100 text-emerald-800 ring-emerald-600/30",
};

function typeStyle(cycleType?: string | null): string {
  const key = (cycleType ?? "").trim().toLowerCase();
  return (
    CYCLE_TYPE_STYLES[key] ?? "bg-violet-100 text-violet-800 ring-violet-600/30"
  );
}

export function CycleBadge({
  cycleNumber,
  cycleType,
  className,
}: {
  cycleNumber?: number | null;
  cycleType?: string | null;
  className?: string;
}) {
  if (!cycleNumber) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span
      data-tip={cycleType ? `Cert cycle #${cycleNumber} · ${cycleType}` : `Cert cycle #${cycleNumber}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums ring-1 ring-inset",
        typeStyle(cycleType),
        className,
      )}
    >
      <span className="opacity-70">#</span>
      {cycleNumber}
      {cycleType && (
        <span className="max-w-24 truncate text-[10px] font-medium opacity-80">
          {cycleType}
        </span>
      )}
    </span>
  );
}
