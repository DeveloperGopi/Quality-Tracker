/**
 * IA REMINDER BANNER — the top-of-page nudge that a quarter's IA report is due.
 *
 * PART 2: the banner used to say "data for this quarter has not been imported
 * yet" whenever an ended quarter had no import BATCH — even with every score
 * stored — and its overdue number counted from the quarter end, ignoring the
 * grace period. It now reads the coverage of the stored data (scores per
 * facility, legacy back-filled rows included) through ONE pure rule
 * (lib/iaImport.iaReminderStatus):
 *
 *   Complete (≥ admin threshold, default 95%) → no banner
 *   Partial / Missing                          → banner with the exact counts
 *   Due date = quarter end + admin grace days; overdue only when positive
 *
 * One shared rule drives the banner, the Bulk Import success line and the
 * reminder email. Dismissal is per user for 24 hours.
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { CalendarClock, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { todayLocalIso } from "@/lib/today";
import {
  currentIaQuarter,
  formatFyQuarter,
  iaReminderStatus,
  lastQuarters,
  type IaCoverageState,
} from "@/lib/iaImport";

const DISMISS_KEY = "nqas.ia.banner.dismiss";

type Dismissal = { key: string; at: number };

function readDismissal(): Dismissal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Dismissal;
    if (!parsed?.key || typeof parsed.at !== "number") return null;
    // Per user, per quarter + coverage: a new import invalidates the key.
    return parsed;
  } catch {
    return null;
  }
}

const TONE: Record<IaCoverageState, string> = {
  missing: "border-amber-300/60 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
  partial: "border-amber-300/60 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
  complete: "border-emerald-300/60 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10",
};

export function IaReminderBanner({ className = "" }: { className?: string }) {
  const ctx = useQuery(api.ia.getIaReminderContext, {});
  const markFinal = useMutation(api.ia.markIaQuarterFinal);
  // Read once on mount (lazy initialiser — no setState-in-effect cascade).
  const [dismissed, setDismissed] = useState<Dismissal | null>(() => readDismissal());
  const [busy, setBusy] = useState(false);

  if (!ctx) return null;

  const status = iaReminderStatus(todayLocalIso(), ctx.coverage, {
    graceDays: ctx.graceDays,
    threshold: ctx.threshold,
    totalFacilities: ctx.totalFacilities,
  });

  const dismiss = (key: string) => {
    const next = { key, at: Date.now() };
    try {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* private mode — dismiss for this render only */
    }
    setDismissed(next);
  };

  const finalise = async (fy: string, q: 1 | 2 | 3 | 4, label: string) => {
    setBusy(true);
    try {
      const res = await markFinal({ fy, quarter: q, lock: false });
      toast.success(`${label} marked final`, {
        description: `${res.rows} facility rows are now final.`,
      });
    } catch (err) {
      toast.error("Could not mark the quarter final", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  /* ---- A quarter in progress is provisional until it ends --------------- */
  if (!status.dueLabel) {
    const cand = status.finalCandidate;
    if (!cand) return null;
    return (
      <div
        className={`${className} mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-500/40 dark:bg-emerald-500/10`}
        role="status"
        data-testid="ia-coverage-success"
      >
        <CheckCircle2 className="size-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
        <span className="flex-1">
          <strong>{cand.label}:</strong> {cand.reported} of {cand.total} facilities reported ✓
          <span className="ml-1 rounded-full border border-emerald-400/50 px-1.5 py-0.5 text-[11px] font-medium">
            provisional
          </span>
        </span>
        {ctx.canFinalise && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            disabled={busy}
            onClick={() => void finalise(cand.fy, cand.q, cand.label)}
          >
            {busy ? "Saving…" : `Mark ${cand.label.split(" ")[0]} final`}
          </Button>
        )}
      </div>
    );
  }

  // Dismissal is per user, per quarter AND coverage — a new import changes the
  // counts and the banner comes back until the quarter is complete.
  const key = `${status.dueFy}|Q${status.dueQ}|${status.reported}/${status.total}`;
  if (dismissed?.key === key) return null;

  return (
    <div
      className={`${className} mb-4 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${TONE[status.state ?? "missing"]}`}
      role="status"
      data-testid="ia-reminder-banner"
      data-quarter={status.dueLabel}
      data-state={status.state}
    >
      <CalendarClock className="size-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <span className="flex-1" data-testid="ia-reminder-message">
        {status.message}
      </span>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link
          to={`/bulk-import/internal-assessment?fy=${encodeURIComponent(
            status.dueFy ?? "",
          )}&q=${status.dueQ ?? ""}`}
        >
          Import IA scores
        </Link>
      </Button>
      <button
        type="button"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="Dismiss this reminder for 24 hours"
        data-testid="ia-banner-dismiss"
        onClick={() => dismiss(key)}
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Import-history hint (Part 3.5 of the facility-sheet brief).
 *
 * A quarter that was NEVER IMPORTED and a facility that never reported look
 * identical on a facility sheet ("Not reported"), so Bulk Import → Internal
 * Assessment names the missing quarters up front:
 *
 *   "Import history: Q3 2025-26 and Q4 2025-26 are missing for 157 facilities."
 *
 * It reads the same coverage the reminder banner uses (no second count) over
 * the last four quarters up to the current one, and disappears when every
 * quarter has at least one imported row.
 */
export function IaMissingQuartersHint({ className = "" }: { className?: string }) {
  const ctx = useQuery(api.ia.getIaReminderContext, {});
  if (!ctx) return null;
  const now = currentIaQuarter(todayLocalIso());
  const missing = lastQuarters(now.fy, now.q, 4).filter((period) => {
    const row = ctx.coverage.find((c) => c.fy === period.fy && c.q === period.q);
    return !row || row.reported === 0;
  });
  if (!missing.length) return null;
  const labels = missing.map((p) => formatFyQuarter(p.fy, p.q));
  const names =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  const total = ctx.totalFacilities;
  return (
    <p
      className={`${className} flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200`}
      data-testid="ia-missing-quarters"
    >
      <strong>Import history:</strong> {names} missing for {total} facilit
      {total === 1 ? "y" : "ies"} — a facility sheet showing “Not reported” for
      those quarters has no imported row.
    </p>
  );
}

/** The one-line coverage state used by Bulk Import → Internal Assessment:
 *  "Q2 2026-27: 157 of 157 facilities reported ✓" (same rule, same data). */
export function IaCoverageLine({ className = "" }: { className?: string }) {
  const ctx = useQuery(api.ia.getIaReminderContext, {});
  if (!ctx) return null;
  const status = iaReminderStatus(todayLocalIso(), ctx.coverage, {
    graceDays: ctx.graceDays,
    threshold: ctx.threshold,
    totalFacilities: ctx.totalFacilities,
  });
  const label = status.dueLabel ?? status.lastImportedLabel;
  if (!label) return null;
  const latest = ctx.coverage.find(
    (c) => c.fy === status.lastImportedFy && c.q === status.lastImportedQ,
  );
  const reported = status.dueLabel ? status.reported : (latest?.reported ?? 0);
  const total = status.dueLabel
    ? status.total
    : (latest?.total ?? ctx.totalFacilities);
  const complete = reported > 0 && reported >= (total * ctx.threshold) / 100;
  const provisional = status.dueLabel ? false : status.latestProvisional;
  return (
    <p
      className={`${className} flex flex-wrap items-center gap-1.5 text-sm ${complete ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}
      data-testid="ia-coverage-line"
    >
      <strong>{label}:</strong> {reported} of {total} facilities reported{complete ? " ✓" : ""}
      {provisional && (
        <span className="rounded-full border border-amber-400/60 px-1.5 py-0.5 text-[11px] font-medium">
          provisional
        </span>
      )}
    </p>
  );
}
