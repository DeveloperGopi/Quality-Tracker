/**
 * QUICK VIEW HEADER — sticky, one row, no repeated names.
 *
 * Left: facility name + ONE subtitle ("CHC · Alangayam block · PHC Alangayam ·
 * NIN 4527324786" with a copy button on the NIN).
 * Right: Facility Current Status pill, Certification Cycle pill, a single
 * "Updated …" chip only when the record changed recently, list position
 * ("3 of 27") with prev/next arrows, the View | Edit switch, and Close.
 */

import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, Lock, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FacilityCell } from "@/components/FacilityCell";
import { StatusPill } from "@/components/master/SmartCells";
import { StatusChip } from "@/components/StatusChip";
import type { MasterRow } from "@/lib/masterColumns";
import { cn } from "@/lib/utils";

export function QuickViewHeader({
  row,
  index,
  total,
  onPrev,
  onNext,
  mode,
  canEdit,
  onModeChange,
  onClose,
  updatedLabel,
  status,
  copied,
  onCopyNin,
  draftExists,
  requiredDocMissing = 0,
  onOpenDocuments,
}: {
  row: MasterRow;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  mode: "view" | "edit";
  canEdit: boolean;
  onModeChange: (mode: "view" | "edit") => void;
  onClose: () => void;
  updatedLabel?: string | null;
  /** Facility Current Status to display. The dialog passes the READ-TIME value,
   *  so a certified facility's surveillance sentence follows the done dates
   *  instead of a stored sentence written before the last import. */
  status?: string;
  copied: boolean;
  onCopyNin: () => void;
  /** A saved local draft exists for this facility — reopening says so. */
  draftExists?: boolean;
  /** Required documents missing under the LIVE Admin rules. ONE amber chip
   *  (same list as the Documents banner) that opens the Documents section. */
  requiredDocMissing?: number;
  onOpenDocuments?: () => void;
}) {
  const f = row.facility;
  const currentStatus = status ?? f.currentStatus ?? "";
  const nin = f.ninNumber?.trim();
  const cycle = row.cycleNumber
    ? `Cycle ${row.cycleNumber}${row.cycleType ? ` · ${row.cycleType}` : ""}`
    : null;

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {/* The SAME Facility cell used by every list. NIN is deliberately
              outside it, with its copy control. */}
          <FacilityCell
            facility={{ ...f, name: f.name || "Facility" }}
            nameAs="h2"
            nameId="qv-title"
            onOpen={() => undefined}
            className="max-w-full"
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {nin && (
              <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-1.5 text-[11px] font-medium text-muted-foreground">
                NIN {nin}
                <button
                  type="button"
                  onClick={onCopyNin}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={copied ? "NIN copied" : "Copy NIN"}
                  data-tip="Copy NIN"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                </button>
              </span>
            )}
            {currentStatus && <StatusPill value={currentStatus} />}
            {cycle && <StatusChip label={cycle} tone="blue" size="sm" />}
            {requiredDocMissing > 0 && (
              <button
                type="button"
                onClick={onOpenDocuments}
                data-testid="qv-required-doc-chip"
                data-tip="Open Documents — the required file is missing"
                className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <AlertTriangle className="size-3" aria-hidden />
                {requiredDocMissing} required document{requiredDocMissing === 1 ? "" : "s"} missing
              </button>
            )}
            {updatedLabel && (
              <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {updatedLabel}
              </span>
            )}
            {draftExists && (
              <span
                data-testid="qv-draft-badge"
                className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                data-tip="Unsaved edits from your last visit are kept as a draft on this device"
              >
                Draft
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {total > 1 && (
            <div className="mr-1 flex items-center gap-0.5 rounded-lg border border-border/60 bg-background p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={onPrev}
                aria-label="Previous facility (K)"
                data-tip="Previous facility (K)"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span
                className="min-w-14 text-center text-[11px] font-medium tabular-nums text-muted-foreground"
                aria-live="polite"
              >
                {index + 1} of {total}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={onNext}
                aria-label="Next facility (J)"
                data-tip="Next facility (J)"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          <div
            role="group"
            aria-label="Mode"
            className="flex rounded-lg border border-border/60 bg-muted/40 p-0.5"
          >
            <button
              type="button"
              aria-pressed={mode === "view"}
              onClick={() => onModeChange("view")}
              className={cn(
                "min-h-8 rounded-md px-2.5 text-xs font-semibold transition-colors",
                mode === "view"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              View
            </button>
            {canEdit && (
              <button
                type="button"
                aria-pressed={mode === "edit"}
                onClick={() => onModeChange("edit")}
                className={cn(
                  "flex min-h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors",
                  mode === "edit"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Pencil className="size-3" /> Edit
              </button>
            )}
          </div>

          {!canEdit && (
            <span
              className="flex items-center gap-1 text-[11px] text-muted-foreground"
              data-tip="Your role can view facilities but not edit them"
            >
              <Lock className="size-3.5" /> View only
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onClose}
            aria-label="Close quick view"
            data-tip="Close (Esc)"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

