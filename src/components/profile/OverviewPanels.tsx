// OverviewPanels — the Facility Profile Overview's command-view panels:
// Needs attention, section summary cards, recent activity, the cycle
// switcher with its score-trend sparkline, and the validity ring gauge.
//
// All of them read the SAME derived records the assessment tabs edit (see
// lib/facilityProfileRules), so the Overview can never contradict a form.

import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, History, Pencil, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusChip, ToneBar, ToneIcon, TONE_HEX, type Tone } from "@/components/StatusChip";
import { toDisplayDate } from "@/lib/format";
import { type AttentionItem, type SectionSummary } from "@/lib/facilityProfileRules";

// ---------------------------------------------------------------------------
// RingGauge — a small SVG ring for "certificate validity, n days left".
// Colour + a printed number, never colour alone. Respects reduced motion.
// ---------------------------------------------------------------------------

export function RingGauge({
  daysLeft,
  totalDays,
  size = 56,
}: {
  daysLeft: number | null;
  /** Full arc length — days of validity from the certification date. */
  totalDays: number | null;
  size?: number;
}) {
  const pct =
    daysLeft == null || totalDays == null || totalDays <= 0
      ? 0
      : Math.max(0, Math.min(1, daysLeft / totalDays));
  const tone: Tone =
    daysLeft == null ? "grey" : daysLeft < 0 ? "red" : daysLeft <= 90 ? "amber" : "green";
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={
        daysLeft == null ? "No certificate validity recorded" : `${daysLeft} days of validity left`
      }>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          stroke={TONE_HEX[tone]}
          className="motion-reduce:transition-none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute text-center text-[10px] leading-tight font-bold tabular-nums">
        {daysLeft == null ? (
          <ToneIcon tone="grey" className="size-3.5" />
        ) : (
          <>
            {daysLeft < 0 ? `${Math.abs(daysLeft)}d` : daysLeft}
            <span className="block text-[8px] font-medium text-muted-foreground">
              {daysLeft < 0 ? "expired" : "days"}
            </span>
          </>
        )}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// NeedsAttentionPanel — auto-generated problems, each with a Fix button
// ---------------------------------------------------------------------------

export function NeedsAttentionPanel({
  items,
  onFix,
}: {
  items: AttentionItem[];
  /** Called with (tab, focusKey) — jumps to the tab and focuses the field. */
  onFix: (tab: string, focus?: string) => void;
}) {
  if (items.length === 0) {
    return (
      <section
        aria-label="Needs attention"
        className="glass rounded-xl border border-emerald-300/60 bg-emerald-500/5 p-4"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          <Check className="size-4" /> Nothing needs attention
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          No contradictory statuses, missing documents or overdue visits on this facility.
        </p>
      </section>
    );
  }
  return (
    <section
      aria-label="Needs attention"
      className="glass rounded-xl border border-border/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          Needs attention
          <span className="ml-1.5 font-normal text-muted-foreground">
            — {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </p>
        <span className="text-xs text-muted-foreground">Checked on every load</span>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3",
              item.severity === "danger" && "border-rose-300/70 bg-rose-500/5",
              item.severity === "warning" && "border-amber-300/70 bg-amber-500/5",
              item.severity === "info" && "border-sky-300/60 bg-sky-500/5",
            )}
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <ToneIcon
                tone={item.severity === "danger" ? "red" : item.severity === "warning" ? "amber" : "blue"}
                className="mt-0.5 size-4"
              />
              <div className="min-w-0">
                <p className="text-sm leading-snug font-semibold">{item.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.detail}</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={item.severity === "danger" ? "default" : "outline"}
              className="min-h-11 shrink-0 gap-1"
              onClick={() => onFix(item.tab, item.focus)}
            >
              {item.fixLabel} <ArrowRight className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// SectionSummaryCard — 3–4 key values + status pill + completeness bar
// ---------------------------------------------------------------------------

export function SectionSummaryCard({
  summary,
  onEdit,
}: {
  summary: SectionSummary;
  onEdit: (tab: string) => void;
}) {
  const pct = Math.round((summary.filled / Math.max(1, summary.total)) * 100);
  const tone: Tone = pct === 100 ? "green" : pct >= 50 ? "blue" : "amber";
  return (
    <article className="glass flex flex-col rounded-xl border border-border/60 p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{summary.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {summary.filled} of {summary.total} fields filled
          </p>
        </div>
        <StatusChip label={summary.chip.label} tone={summary.chip.tone} />
      </header>
      <dl className="mt-3 grid flex-1 gap-1.5">
        {summary.rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-2 text-xs">
            <dt className="shrink-0 text-muted-foreground">{r.label}</dt>
            <dd className="min-w-0 truncate text-right font-medium tabular-nums" data-tip={r.value} data-tip-truncate>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
      <ToneBar value={pct} tone={tone} className="mt-3" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-start gap-1.5 text-primary"
        onClick={() => onEdit(summary.tab)}
      >
        <Pencil className="size-3.5" /> Edit {summary.title}
      </Button>
    </article>
  );
}

// ---------------------------------------------------------------------------
// RecentActivity — last N audit entries with a View-all link
// ---------------------------------------------------------------------------

export type AuditEntry = {
  _id: string;
  changedAt: number;
  changedByName?: string | null;
  field?: string | null;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  table?: string;
};

/** "3 h ago" — relative time for the activity rows. */
function relativeTime(ts: number, now = Date.now()): string {
  const mins = Math.round((now - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return toDisplayDate(new Date(ts).toISOString().slice(0, 10));
}

/** The table an audit row belongs to → a readable filter chip. */
const ACTIVITY_SECTIONS: Record<string, string> = {
  facilities: "Facility",
  stateAssessments: "State Assessment",
  nationalAssessments: "NQAS Assessment",
  certificationCycles: "Cycle",
  gapClosureFunds: "Gap Closure",
  fireNocs: "Fire NOC",
  buildingDetails: "Building",
  facilityDocuments: "Documents",
  facilityIaQuarters: "Internal Assessment",
};

/**
 * RecentActivity — deliberately at the END of the profile, collapsed by
 * default, and lazy: nothing is rendered until the user opens it. The Show/Hide
 * choice is remembered per user (localStorage). It shows the last 10 changes
 * with before → after, who and how long ago, plus a section filter.
 */
export function RecentActivity({
  audits,
  onViewAll,
}: {
  audits: AuditEntry[];
  onViewAll: () => void;
}) {
  const { user } = useAuth();
  const storageKey = `nqas.recentActivity.open:${user?._id ?? "anon"}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const [section, setSection] = useState<string>("all");
  const toggle = () => {
    setOpen((v) => {
      try {
        localStorage.setItem(storageKey, v ? "0" : "1");
      } catch {
        /* private mode — the in-memory state still works */
      }
      return !v;
    });
  };
  const sections = useMemo(
    () => [...new Set(audits.map((a) => a.table).filter((t): t is string => !!t))],
    [audits],
  );
  const recent = useMemo(
    () =>
      audits
        .filter((a) => section === "all" || a.table === section)
        .slice(0, 10),
    [audits, section],
  );

  return (
    <section
      aria-label="Recent activity"
      className="glass rounded-xl border border-border/60"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <History className="size-4 text-primary" />
          Recent activity
          <span className="font-normal text-muted-foreground">· {audits.length} change{audits.length === 1 ? "" : "s"}</span>
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
        <div className="flex items-center gap-2">
          {open && sections.length > 1 && (
            <select
              aria-label="Filter recent activity by section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
            >
              <option value="all">All sections</option>
              {sections.map((t) => (
                <option key={t} value={t}>
                  {ACTIVITY_SECTIONS[t] ?? t}
                </option>
              ))}
            </select>
          )}
          <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={onViewAll}>
            View full audit <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
      {open &&
        (recent.length === 0 ? (
          <p className="px-4 pb-3 text-xs text-muted-foreground">
            No changes recorded yet — every edit appears here with who made it.
          </p>
        ) : (
          <ol className="space-y-2 border-t border-border/40 px-4 py-3">
            {recent.map((a) => (
              <li key={a._id} className="flex min-w-0 items-start gap-2 text-xs">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/60" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="break-words">
                    <span className="font-semibold">{a.field ?? a.action}</span>
                    {a.oldValue != null && a.newValue != null && String(a.oldValue) !== String(a.newValue) && (
                      <span className="text-muted-foreground">
                        {" "}
                        {String(a.oldValue).slice(0, 40)} → {String(a.newValue).slice(0, 40)}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    {ACTIVITY_SECTIONS[a.table ?? ""] ?? a.table ?? "Profile"} · {a.changedByName ?? "System"} · {" "}
                    {relativeTime(a.changedAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// ScoreSparkline — tiny SVG trend across cycles (compare-cycles affordance)
// ---------------------------------------------------------------------------

export function ScoreSparkline({
  points,
  label = "NQAS score trend",
}: {
  points: { cycle: number; score: number | null }[];
  label?: string;
}) {
  const withScores = points.filter((p) => p.score != null);
  if (withScores.length < 2) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Score trend appears once two cycles have scores.
      </p>
    );
  }
  const w = 120;
  const h = 32;
  const xs = withScores.map((_, i) => (i / (withScores.length - 1)) * (w - 8) + 4);
  const ys = withScores.map((p) => h - 4 - ((p.score as number) / 100) * (h - 8));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} role="img" aria-label={label} className="shrink-0">
      <path d={d} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="2.5" fill="var(--color-primary)" />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CycleSwitcher — segmented control over cycles; past cycles read-only
// ---------------------------------------------------------------------------

export function CycleSwitcher({
  cycles,
  selected,
  onSelect,
  scoreTrend,
}: {
  cycles: { cycleNumber: number; cycleType: string; superseded?: boolean | null }[];
  selected: number | null;
  onSelect: (cycleNumber: number | null) => void;
  scoreTrend: { cycle: number; score: number | null }[];
}) {
  if (cycles.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div
        role="tablist"
        aria-label="Certification cycles"
        className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selected === null}
          onClick={() => onSelect(null)}
          className={cn(
            "inline-flex min-h-9 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            selected === null
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Latest
        </button>
        {cycles.map((c) => (
          <button
            key={c.cycleNumber}
            type="button"
            role="tab"
            aria-selected={selected === c.cycleNumber}
            onClick={() => onSelect(c.cycleNumber)}
            data-tip={c.superseded ? "Past cycle — read-only history" : "Active cycle"}
            className={cn(
              "inline-flex min-h-9 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              selected === c.cycleNumber
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            #{c.cycleNumber}
            {c.superseded && (
              <Badge variant="secondary" className="px-1 py-0 text-[9px] font-medium">
                history
              </Badge>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <TrendingUp className="size-3.5 text-muted-foreground" aria-hidden />
        <ScoreSparkline points={scoreTrend} />
      </div>
    </div>
  );
}
