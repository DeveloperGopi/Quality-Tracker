/**
 * IA BATCH REPORT — the shared "build one batch's Excel import report" worker,
 * reused by the IAImport page AND the Bulk Import page's unified Import
 * history (it is the exact code the IA page used, extracted so the same
 * column model renders the workbook wherever a batch is downloaded from).
 */

import { useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { downloadIaImportReport } from "@/lib/iaReport";
import {
  IA_TRACKERS,
  type CleanIaRow,
  type IaPreviewRow,
  type IaPreviewState,
  type IaRowChange,
  type IaStoredQuarter,
  type IaTracker,
} from "@/lib/iaImport";

export type BatchRow = {
  rowNo: number;
  facilityId?: string | null;
  facilityName?: string | null;
  facilityBlock?: string | null;
  facilityPhc?: string | null;
  matchMethod: string;
  confidence: number;
  result: string;
  error?: string | null;
  notes?: string | null;
  raw?: unknown;
  cleaned?: unknown;
  oldValue?: unknown;
  newValue?: unknown;
};

/** The before-image the batch stored — exactly snapshot() on the server. */
type IaSnapshot = {
  fy: string;
  quarter: number;
  nqasIaScore?: number | null;
  kayakalpIaScore?: number | null;
  ecoFriendlyScore?: number | null;
  nqasRemark?: string | null;
  kayakalpRemark?: string | null;
  ecoRemark?: string | null;
  lockedAt?: number | null;
} | null;

const stateOfResult = (r: string): IaPreviewState =>
  r === "updated" ? "ready" : r === "no_change" ? "no_change" : r === "undone" ? "no_change" : r === "skipped" ? "skipped" : "error";

const changeOfResult = (r: string, before: IaSnapshot): IaRowChange =>
  r === "updated" ? (before ? "changed" : "new") : r === "no_change" || r === "undone" ? "same" : "none";

/** Rebuild a PreviewRow from a stored importRows document so the SAME column
 *  model (iaPreviewColumns) renders the batch's Excel report. */
export function importRowToPreview(
  r: BatchRow,
  recent: readonly IaStoredQuarter[],
): IaPreviewRow {
  const c = (r.cleaned ?? {}) as {
    fy?: string;
    quarter?: number;
    nqas?: string;
    kayakalp?: string;
    eco?: string;
    key?: string;
    name?: string;
    nin?: string;
  };
  const before = (r.oldValue ?? null) as IaSnapshot;
  const fy = c.fy ?? before?.fy ?? "";
  const quarter = before ? before.quarter : (c.quarter ?? 0);
  const scoresRaw: Record<IaTracker, string> = {
    nqas: String(c.nqas ?? ""),
    kayakalp: String(c.kayakalp ?? ""),
    eco: String(c.eco ?? ""),
  };
  const cleaned: CleanIaRow = {
    rowNo: r.rowNo,
    sourceRowNo: r.rowNo,
    raw: (r.raw ?? {}) as Record<string, unknown>,
    key: c.key ?? "",
    name: c.name ?? r.facilityName ?? "",
    block: r.facilityBlock ?? "",
    phc: r.facilityPhc ?? "",
    facilityType: "",
    typeKnown: true,
    nin: c.nin ? String(c.nin) : null,
    ninRaw: c.nin ? String(c.nin) : "",
    ninError: null,
    ninPadded: false,
    fy: fy || null,
    q: quarter >= 1 && quarter <= 4 ? (quarter as 1 | 2 | 3 | 4) : null,
    // Scores carry the STORED after-values (newValue) for updated rows so the
    // report shows what was written, not the raw file text alone.
    scores: {
      nqas: trackerScore("nqas", r, before, scoresRaw),
      kayakalp: trackerScore("kayakalp", r, before, scoresRaw),
      eco: trackerScore("eco", r, before, scoresRaw),
    },
    fyError: false,
    qError: false,
    warnings: [],
  };
  const state = stateOfResult(r.result);
  return {
    rowNo: r.rowNo,
    sourceRowNo: r.rowNo,
    cleaned,
    match: r.facilityId
      ? {
          status: "matched",
          method: (r.matchMethod === "nin" ? "exact" : r.matchMethod) as "helper",
          confidence: r.confidence,
          facilityId: r.facilityId,
          viaNin: r.matchMethod === "nin",
        }
      : { status: "unmatched", method: "none", confidence: 0, facilityId: null, candidateIds: [] },
    facilityId: r.facilityId ?? null,
    facilityName: r.facilityName ?? cleaned.name,
    facilityBlock: r.facilityBlock ?? "",
    facilityPhc: r.facilityPhc ?? "",
    facilityType: cleaned.facilityType,
    nin: cleaned.nin,
    ninError: null,
    ninPadded: false,
    crossCheck: null,
    needsNinConfirm: false,
    unknownNin: false,
    outsideBlocks: false,
    suggestionIds: [],
    edited: [],
    fy: cleaned.fy,
    q: cleaned.q,
    current: trackerCurrent("nqas", before),
    currentRemark: {
      nqas: before?.nqasRemark ?? null,
      kayakalp: before?.kayakalpRemark ?? null,
      eco: before?.ecoRemark ?? null,
    },
    prev: {
      nqas: quarterlyPrevValue(r.facilityId, fy, quarter, "nqas", recent),
      kayakalp: quarterlyPrevValue(r.facilityId, fy, quarter, "kayakalp", recent),
      eco: quarterlyPrevValue(r.facilityId, fy, quarter, "eco", recent),
    },
    trend: [],
    change: {
      nqas: changeOfResult(r.result, before),
      kayakalp: changeOfResult(r.result, before),
      eco: changeOfResult(r.result, before),
    },
    state,
    include: r.result === "updated",
    locked: !!before?.lockedAt,
    stale: false,
    future: false,
    warnings: r.error ? [r.error] : [],
    chips: r.notes ? [r.notes] : [],
  };
}

function trackerScore(t: IaTracker, r: BatchRow, before: IaSnapshot, scoresRaw: Record<IaTracker, string>) {
  const after = (r.newValue ?? null) as IaSnapshot;
  const wrote = r.result === "updated";
  const fieldOf = (s: IaSnapshot | null) =>
    t === "nqas" ? s?.nqasIaScore ?? null : t === "kayakalp" ? s?.kayakalpIaScore ?? null : s?.ecoFriendlyScore ?? null;
  const remarkOf = (s: IaSnapshot | null) =>
    t === "nqas" ? s?.nqasRemark ?? null : t === "kayakalp" ? s?.kayakalpRemark ?? null : s?.ecoRemark ?? null;
  const raw = scoresRaw[t];
  if (wrote) {
    const value = fieldOf(after);
    const remark = remarkOf(after);
    return { value, remark, chip: null, error: false, fraction: false, raw };
  }
  const value = before ? fieldOf(before) : null;
  const remark = before ? remarkOf(before) : null;
  return {
    value: raw.trim() === "" ? value : parseNumberOrNull(raw),
    remark: raw.trim() === "" ? remark : raw.trim() === "" ? null : remark,
    chip: null,
    error: false,
    fraction: false,
    raw,
  };
}

function parseNumberOrNull(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function trackerCurrent(_t: IaTracker, before: IaSnapshot): Record<IaTracker, number | null> {
  if (!before) return { nqas: null, kayakalp: null, eco: null };
  return {
    nqas: before.nqasIaScore ?? null,
    kayakalp: before.kayakalpIaScore ?? null,
    eco: before.ecoFriendlyScore ?? null,
  };
}

/** The PREVIOUS quarter's stored value for the movement column. */
function quarterlyPrevValue(
  facilityId: string | null | undefined,
  fy: string,
  quarter: number,
  _t: IaTracker,
  recent: readonly IaStoredQuarter[],
): number | null {
  void _t;
  if (!facilityId || !fy || quarter < 1) return null;
  const [prevFy, prevQ] = quarter === 1 ? [String(Number(fy.slice(0, 4)) - 1), 4] : [fy, quarter - 1];
  const prev = recent.find((q) => q.facilityId === facilityId && q.fy === prevFy && q.quarter === prevQ);
  return prev
    ? (prev.nqasIaScore ?? prev.kayakalpIaScore ?? prev.ecoFriendlyScore)
    : null;
}

/** Child that fetches one batch's rows and writes the Excel report once they
 *  arrive — keeps the "skip" pattern out of the table component. */
export function IaBatchReportWorker({
  batchId,
  fileName,
  importedByName,
  summary,
  onDone,
  onError,
}: {
  batchId: Id<"importBatches">;
  fileName: string;
  importedByName: string;
  summary: { updated: number; noChange: number; skipped: number; failed: number };
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const rows = useQuery(api.imports.listImportBatchRows, { batchId });
  const recent = useQuery(api.ia.listIaQuarters, { limit: 20000 });
  const recentStored: IaStoredQuarter[] = useMemo(
    () =>
      (recent ?? []).map((q) => ({
        facilityId: q.facilityId,
        fy: q.fy,
        quarter: q.quarter,
        nqasIaScore: q.nqasIaScore,
        kayakalpIaScore: q.kayakalpIaScore,
        ecoFriendlyScore: q.ecoFriendlyScore,
        nqasRemark: q.nqasRemark,
        kayakalpRemark: q.kayakalpRemark,
        ecoRemark: q.ecoRemark,
        lockedAt: q.lockedAt,
        updatedAt: q.updatedAt,
      })),
    [recent],
  );
  useEffect(() => {
    if (!rows) return;
    const preview = rows.map((row: BatchRow) => importRowToPreview(row, recentStored));
    downloadIaImportReport({
      fileName,
      generatedBy: importedByName,
      generatedAt: new Date(),
      rows: preview,
      summary: {
        ...summary,
        skipped: summary.skipped + Math.max(0, rows.length - (summary.updated + summary.noChange + summary.failed)),
      },
      trackers: trackersOf(rows),
    })
      .then(onDone)
      .catch(() => onError("Could not build the report"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, recent]);
  return (
    <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Building the report…
    </p>
  );
}

/** Trackers the batch actually carried (kept for the report's column set). */
function trackersOf(rows: readonly BatchRow[]): IaTracker[] {
  const carried = IA_TRACKERS.filter((t) =>
    rows.some((row) => {
      const c = (row.cleaned ?? {}) as Record<string, unknown>;
      return String(c[t === "nqas" ? "nqas" : t === "kayakalp" ? "kayakalp" : "eco"] ?? "").trim() !== "";
    }),
  );
  return carried.length ? carried : [...IA_TRACKERS];
}
