/**
 * ACTIVITY TAB — the user's own last 20 audit entries, in plain words.
 *
 * Lazy by construction: this component (and therefore the `profile.myActivity`
 * query) is only mounted when the tab opens — the profile query never touches
 * the audit table any more (it used to collect() the whole table on load).
 *
 * Every line is produced by the mapping table in src/lib/profileConfig:
 *   "update SA Actual Start Date" → "Updated SA actual start date · Alangayam"
 * Unknown actions fall back to a readable default; stored values, file names
 * and secrets are never printed.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { History, ExternalLink } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { toDisplayStamp } from "@/lib/format";
import {
  ACTIVITY_FILTERS,
  dayLabel,
  describeActivity,
  nowMs,
  relativeTime,
  type ActivityCategory,
} from "@/lib/profileConfig";
import { cn } from "@/lib/utils";

export default function ActivityTab({ isAdmin }: { isAdmin: boolean }) {
  const [filter, setFilter] = useState<ActivityCategory | "all">("all");
  const rows = useQuery(api.profile.myActivity, { filter });
  const now = nowMs();

  return (
    <section
      data-testid="activity-tab"
      className="rounded-xl border border-border/60 bg-card p-4"
      aria-label="Activity"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Activity</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your last 20 actions (read-only) — loaded when this tab opens.
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/admin/audit"
            data-testid="activity-full-audit"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" /> View full audit
          </Link>
        )}
      </div>

      {/* ---- Filter chips ---- */}
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter activity">
        {ACTIVITY_FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              data-testid={`activity-filter-${f.value}`}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-foreground/40",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ---- List (or skeleton) ---- */}
      {rows === undefined ? (
        <div className="mt-3 space-y-2" data-testid="activity-skeleton">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <History className="size-4" aria-hidden="true" />
          {filter === "all" ? "No recorded activity yet." : "Nothing in this category yet."}
        </p>
      ) : (
        <ul className="mt-3 -mx-3 border-t border-border/40" data-testid="activity-list">
          {(() => {
            let lastDay = "";
            return rows.map((row) => {
              const day = dayLabel(row.at, now);
              const showDay = day !== lastDay;
              lastDay = day;
              const entry = describeActivity(row);
              return (
                <li key={row.id} data-testid="activity-item" data-category={entry.category}>
                  {showDay && (
                    <p className="border-b border-border/40 bg-muted/40 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                      {day}
                    </p>
                  )}
                  <div className="flex min-h-10 items-start gap-2 border-b border-border/40 px-3 py-2">
                    <span
                      className="w-20 shrink-0 pt-0.5 text-[11px] text-muted-foreground tabular-nums"
                      data-tip={toDisplayStamp(row.at)}
                    >
                      {relativeTime(row.at, now)}
                    </span>
                    <span className="min-w-0 text-[13px] leading-snug">
                      {entry.text}
                      {row.facilityName && row.facilityId && (
                        <>
                          {" · "}
                          <Link
                            to={`/facilities?facility=${row.facilityId}`}
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            {row.facilityName}
                          </Link>
                        </>
                      )}
                    </span>
                  </div>
                </li>
              );
            });
          })()}
        </ul>
      )}
    </section>
  );
}
