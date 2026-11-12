/**
 * MOBILE FACILITY CARDS — the master list below the `sm` breakpoint.
 *
 * 54 columns cannot be read on a phone, so instead of a squeezed table the
 * page shows one card per facility with the identity block, the live status
 * pills and the dates people actually ask about.
 *
 * Task C §6: each card ends with a full-width 44px Update button (Viewers
 * see View) and a ⋯ "More actions" button — the same handlers the desktop
 * row-actions column uses, so the behaviour can never drift apart.
 */

import {
  ChevronRight,
  Eye,
  ExternalLink,
  History,
  MoreHorizontal,
  Pencil,
  Printer,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  cellValue,
  stageOf,
  type MasterRow,
} from "@/lib/masterColumns";
import { DateCell, ScoreBar, StatusPill, EMPTY_TEXT } from "@/components/master/SmartCells";
import { FacilityCell } from "@/components/FacilityCell";

/** The keys shown on a card (identity + the headline signals). */
const CARD_KEYS = [
  "certStatus",
  "certScore",
  "validityDate",
  "nocStatus",
  "survDue1",
] as const;

export function MobileFacilityCards({
  rows,
  labels,
  onOpen,
  onClear,
  canEdit = false,
  onUpdate,
  onViewHistory,
  onPrint,
  onExport,
  onPrefetch,
  savedIds,
  draftIds,
  query = "",
}: {
  rows: MasterRow[];
  labels: Record<string, string>;
  query?: string;
  onOpen: (row: MasterRow) => void;
  onClear?: () => void;
  /** Task C §6: role-aware primary action (Viewers see View). */
  canEdit?: boolean;
  onUpdate?: (row: MasterRow) => void;
  onViewHistory?: (row: MasterRow) => void;
  onPrint?: (row: MasterRow) => void;
  onExport?: (row: MasterRow, format: "pdf" | "excel") => void;
  onPrefetch?: (row: MasterRow) => void;
  savedIds?: ReadonlySet<string>;
  draftIds?: ReadonlySet<string>;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <p className="text-base font-semibold">No facilities match your filters</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Clear a filter or search for another facility, PHC, block or NIN.
        </p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2 p-2">
      {rows.map((r) => {
        const id = String(r.facility._id);
        const name = r.facility.name || "Facility";
        const justSaved = !!savedIds?.has(id);
        return (
          <li key={id}>
            <div className="rounded-xl border border-border/60 bg-background p-3 transition-colors hover:border-primary/40">
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a")) return;
                  onOpen(r);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  onOpen(r);
                }}
                className="w-full cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="flex items-start justify-between gap-2">
                  <FacilityCell
                    facility={r.facility}
                    query={query}
                    compact
                    onOpen={() => onOpen(r)}
                    className="min-w-0 flex-1"
                  />
                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                </span>

                <span className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[11px]">
                    {r.facility.facilityType}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {stageOf(r).replace(/^\w/, (c) => c.toUpperCase())}
                  </Badge>
                  {draftIds?.has(id) && (
                    <span
                      role="status"
                      aria-label="Saved draft"
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                    >
                      <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
                      Draft
                    </span>
                  )}
                </span>

                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {CARD_KEYS.map((key) => {
                    const v = cellValue(r, key);
                    if (v.kind === "empty" || v.kind === "compare") return null;
                    return (
                      <div key={key} className="min-w-0">
                        <dt className="truncate text-[11px] text-muted-foreground">
                          {labels[key] ?? key}
                        </dt>
                        <dd className={cn("min-w-0 text-[13px]")}>
                          {v.kind === "status" ? (
                            <StatusPill value={v.value} />
                          ) : v.kind === "score" ? (
                            <ScoreBar value={v.value} />
                          ) : v.kind === "date" ? (
                            <DateCell value={v.value} />
                          ) : v.kind === "dueDate" && v.value ? (
                            <DateCell value={v.value} />
                          ) : v.kind === "text" ? (
                            <span className="tabular-nums">{v.value}</span>
                          ) : (
                            <span className="tabular-nums">{EMPTY_TEXT}</span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>

              {/* Task C §6 — full-width actions row: Update / View + ⋯ */}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="lg"
                  variant={canEdit ? "default" : "outline"}
                  className="min-h-11 flex-1"
                  disabled={justSaved}
                  aria-label={`${canEdit ? "Update" : "View"} ${name}`}
                  onMouseEnter={() => onPrefetch?.(r)}
                  onClick={() => {
                    if (justSaved) return;
                    if (canEdit) onUpdate?.(r);
                    else onOpen(r);
                  }}
                >
                  {justSaved ? (
                    <span aria-live="polite">Saved ✓</span>
                  ) : canEdit ? (
                    <>
                      <Pencil className="size-4" aria-hidden /> Update
                    </>
                  ) : (
                    <>
                      <Eye className="size-4" aria-hidden /> View
                    </>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-11 shrink-0"
                      aria-label={`More actions ${name}`}
                      data-tip="More actions"
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-52">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {name}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      aria-label={`Open full profile ${name}`}
                      onSelect={() => {
                        window.location.assign(`/facilities/${id}`);
                      }}
                    >
                      <ExternalLink className="size-4" aria-hidden /> Open full profile
                    </DropdownMenuItem>
                    {onViewHistory && (
                      <DropdownMenuItem onSelect={() => onViewHistory(r)}>
                        <History className="size-4" aria-hidden /> View history
                      </DropdownMenuItem>
                    )}
                    {onPrint && (
                      <DropdownMenuItem onSelect={() => onPrint(r)}>
                        <Printer className="size-4" aria-hidden /> Print facility sheet
                      </DropdownMenuItem>
                    )}
                    {onExport && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onExport(r, "pdf")}>
                          Export this facility (PDF)
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onExport(r, "excel")}>
                          Export this facility (Excel)
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
