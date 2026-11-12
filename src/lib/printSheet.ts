/**
 * PRINT FACILITY SHEET — one request store, one dialog.
 *
 * Every "Print facility sheet" / "Export this facility" button in the app
 * (Quick View, Facility Profile, Master List row menu, phone cards) calls
 * `openPrintSheet(row)`. A single <PrintSheetDialog /> mounted in the app
 * shell reads this store, so the options (paper, empty fields, recent
 * changes, QR) are defined once and every entry point behaves identically.
 *
 * The store is deliberately tiny and pure: no React, no jsPDF, so the request
 * plumbing is unit-testable and the dialog ignores writes it did not ask for.
 */

import type { MasterRow } from "@/lib/masterColumns";
import { facilityReportFileName } from "@/lib/reportNaming";

export type PrintSheetAudit = {
  changedAt: number;
  changedByName?: string | null;
  field?: string | null;
  action: string;
  newValue?: unknown;
};

export type PrintSheetRequest = {
  row: MasterRow;
  /** Audit rows already in hand (the profile page has them). When omitted the
   *  dialog loads the newest few from `facilities.getFacilityAuditTrail`. */
  audits?: PrintSheetAudit[];
  /** The single data-as-of stamp the caller already shows on screen. */
  dataAsOf?: number | null;
  generatedBy?: string;
};

let current: PrintSheetRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * The file name shown in the dialog BEFORE the sheet is rendered — the SAME
 * rule the generator uses (`lib/reportNaming`):
 *
 *   {Facility name} {Type label} NQAS Status Report {DD-MM-YYYY}.pdf
 *
 * `duplicate` is true when another facility shares this name AND type label
 * (names repeat across blocks); the PHC is then appended in brackets. Pass
 * the resolved type-label map from Admin → Shared reports when the caller has
 * it, so the preview can never disagree with the saved file.
 */
export function sheetFileName(
  facility:
    | {
        name?: string | null;
        facilityType?: string | null;
        phc?: string | null;
      }
    | null
    | undefined,
  opts: {
    date?: Date | string;
    duplicate?: boolean;
    typeLabels?: Record<string, string> | null;
    /** Cycles printed vs cycles that exist: a partial print appends
     *  " (Cycle 1)" / " (Cycles 1-2)" so the file says what is inside. */
    cycles?: { chosen: number[]; total: number } | null;
  } = {},
): string {
  return facilityReportFileName({
    name: facility?.name ?? "",
    facilityType: facility?.facilityType ?? "",
    phc: facility?.phc ?? "",
    typeLabels: opts.typeLabels ?? undefined,
    duplicate: opts.duplicate ?? false,
    date: opts.date ?? new Date(),
    ext: "pdf",
    cycles: opts.cycles ?? null,
  });
}

/** Warm the generator chunk so the dialog opens with no wait on click. */
export function prefetchSheet(): void {
  void import("@/lib/facilitySheet");
}

export function openPrintSheet(request: PrintSheetRequest): void {
  current = request;
  prefetchSheet();
  emit();
}

export function closePrintSheet(): void {
  current = null;
  emit();
}

export function subscribePrintSheet(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPrintSheetRequest(): PrintSheetRequest | null {
  return current;
}

/** Test helper — forget any open request between cases. */
export function resetPrintSheetForTests(): void {
  current = null;
  listeners.clear();
}
