/**
 * INTERNAL ASSESSMENT IMPORT — the page.
 *
 * Route: /bulk-import/internal-assessment (the Bulk Import page's IA card;
 * the old /import/ia URL redirects here). Three tabs: the wizard, the Import
 * history (batch list with per-batch report download and Undo) and the
 * quarterly report.
 *
 * Access: State Admin and District Editor (role "entry"). Viewers are denied
 * here AND on the server (ia.getIaImportContext / ia.applyIaBatch).
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/AppShell";
import {
  IaCoverageLine,
  IaMissingQuartersHint,
  IaReminderBanner,
} from "@/components/ia/IaReminderBanner";
import { IaImportWizard } from "@/components/imports/IaImportWizard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileUp, History, Loader2, ShieldAlert, Undo2 } from "lucide-react";
import {
  downloadIaImportReport,
  downloadIaQuarterTemplate,
  downloadIaQuarterlyReport,
  type IaQuarterReportRow,
} from "@/lib/iaReport";
import {
  IA_TRACKERS,
  type CleanIaRow,
  type IaPreviewRow,
  type IaPreviewState,
  type IaRowChange,
  type IaStoredQuarter,
  type IaTracker,
} from "@/lib/iaImport";
import { quarterOverrideOptions } from "@/lib/iaWizard";
import { todayLocalIso } from "@/lib/today";
import { toDisplayStamp } from "@/lib/format";
import { previousQuarter, formatFyQuarter, quarterOrder } from "@/lib/iaImport";

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
function importRowToPreview(
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
  return { value: raw.trim() === "" ? value : parseNumberOrNull(raw), remark: raw.trim() === "" ? remark : raw.trim() === "" ? null : remark, chip: null, error: false, fraction: false, raw };
}

function parseNumberOrNull(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function trackerCurrent(t: IaTracker, before: IaSnapshot): Record<IaTracker, number | null> {
  if (!before) return { nqas: null, kayakalp: null, eco: null };
  return {
    nqas: before.nqasIaScore ?? null,
    kayakalp: before.kayakalpIaScore ?? null,
    eco: before.ecoFriendlyScore ?? null,
  };
  void t;
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
 *  arrive — keeps the "skip" pattern out of the table component. Exported so
 *  the Bulk Import page's unified Import history reuses the SAME builder
 *  (same column model, never a copy) rather than duplicating it. */
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

function IaImportHistory() {
  const batches = useQuery(api.ia.listIaBatches, { limit: 50 });
  const undo = useMutation(api.ia.undoIaBatch);
  const [busy, setBusy] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<{ batchId: string; rows: { rowNo: number; reason: string }[] } | null>(null);
  const [reportBatch, setReportBatch] = useState<Id<"importBatches"> | null>(null);

  const runUndo = async (batchId: string) => {
    setBusy(batchId);
    try {
      const res = await undo({ batchId: batchId as Id<"importBatches"> });
      if (res.conflicts.length > 0) {
        setConflicts({ batchId, rows: res.conflicts.map((c) => ({ rowNo: c.rowNo, reason: c.reason })) });
        toast.warning(`Restored ${res.restored} row(s); ${res.conflicts.length} skipped (edited since the import)`);
      } else {
        toast.success(`Import undone — ${res.restored} row(s) restored`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not undo the import");
    }
    setBusy(null);
  };

  if (batches === undefined) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading the import history…
      </p>
    );
  }
  if (batches.length === 0) {
    return (
      <Card className="glass">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No Internal Assessment imports yet. Every confirmed import is listed here with who / when / file name and an
          Undo button.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="overflow-auto rounded-xl border border-border/60">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/60">
            <tr>
              {["When", "By", "File", "Status", "Total", "Updated", "No change", "Skipped", "Failed", ""].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b._id} className="border-t border-border/40">
                <td className="whitespace-nowrap px-3 py-2 text-xs">{toDisplayStamp(b.importedAt)}</td>
                <td className="px-3 py-2 text-xs">{b.importedByName ?? "—"}</td>
                <td className="max-w-48 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                      {/^pasted/i.test(b.fileName) ? "Paste" : "Upload"}
                    </Badge>
                    <span className="truncate">{b.fileName}</span>
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant="secondary"
                    className={
                      b.status === "undone"
                        ? "bg-muted text-muted-foreground"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    }
                  >
                    {b.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{b.rowsTotal}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{b.rowsUpdated}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{b.rowsNoChange}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{b.rowsSkipped}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{b.rowsFailed}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => setReportBatch(b._id)}>
                      <Download className="size-3.5" /> Report
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={b.status === "undone" || busy === String(b._id)}
                      onClick={() => void runUndo(String(b._id))}
                    >
                      {busy === String(b._id) ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
                      Undo
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!conflicts} onOpenChange={(o) => !o && setConflicts(null)}>
        <DialogContent className="glass-strong sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Some rows could not be undone</DialogTitle>
            <DialogDescription>
              These facilities were edited after the import, so restoring them would lose that edit. They were skipped.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-64 space-y-1 overflow-auto text-xs">
            {conflicts?.rows.map((c) => (
              <li key={c.rowNo}>
                Row {c.rowNo}: {c.reason}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {reportBatch &&
        batches &&
        (() => {
          const batch = batches.find((b) => b._id === reportBatch);
          if (!batch) return null;
          return (
            <IaBatchReportWorker
              batchId={reportBatch}
              fileName={batch.fileName}
              importedByName={batch.importedByName ?? ""}
              summary={{
                updated: batch.rowsUpdated,
                noChange: batch.rowsNoChange,
                skipped: batch.rowsSkipped,
                failed: batch.rowsFailed,
              }}
              onDone={() => {
                setReportBatch(null);
                toast.success("Report downloaded");
              }}
              onError={(message) => {
                setReportBatch(null);
                toast.error(message);
              }}
            />
          );
        })()}
    </>
  );
}

export default function IaImport() {
  const listRows = useQuery(api.ops.listFacilityRowsFast, {});
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = listRows?.me.appRole;
  const allowed = role === "admin" || role === "entry";
  /* The reminder banner deep-links ?fy=2026-27&q=2 — the wizard opens with
     that quarter preselected instead of asking for it again. */
  const initialPeriod = useMemo(() => {
    const fy = params.get("fy");
    const q = Number(params.get("q"));
    return fy && q >= 1 && q <= 4 ? { fy, q: q as 1 | 2 | 3 | 4 } : null;
  }, [params]);

  return (
    <AppShell
      title="Internal Assessment import"
      subtitle="Paste or upload the NIN-based quarterly IA scores, review previous → now, then approve"
    >
      {listRows !== undefined && allowed && (
        <>
          <IaReminderBanner />
          {/* Part 2 ③: the coverage of the latest stored quarter, one line. */}
          <IaCoverageLine className="mb-3" />
          {/* Part 3.5: quarters with NO imported row at all are named here, so
              a "Not reported" cell on a facility sheet is traceable. */}
          <IaMissingQuartersHint className="mb-3" />
        </>
      )}
      {listRows !== undefined && !allowed ? (
        <Card className="glass max-w-lg">
          <CardContent className="flex items-start gap-3 p-6 text-sm text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              The Internal Assessment import is available to the State Admin and District Editors only.
            </span>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="import" className="space-y-4">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-xl border border-border/60 bg-background/60 p-1 sm:w-auto">
            <TabsTrigger value="import" className="gap-1.5 rounded-lg px-3 py-1.5 text-xs">
              <FileUp className="size-3.5" /> Import
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 rounded-lg px-3 py-1.5 text-xs">
              <History className="size-3.5" /> Import history
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 rounded-lg px-3 py-1.5 text-xs">
              <Download className="size-3.5" /> Reports
            </TabsTrigger>
          </TabsList>
          <TabsContent value="import">
            <IaImportWizard
              initialPeriod={initialPeriod}
              onOpenList={() => navigate("/facilities")}
            />
          </TabsContent>
          <TabsContent value="history">
            <IaImportHistory />
          </TabsContent>
          <TabsContent value="reports">
            <IaReportsTab />
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}

/* --------------------------------------------------------------------------- */
/* Reports tab — quarter template + IA Quarterly Report                        */
/* --------------------------------------------------------------------------- */

function IaReportsTab() {
  const today = todayLocalIso();
  const quarterChoices = useMemo(() => quarterOverrideOptions(today), [today]);
  const [sel, setSel] = useState<{ fy: string; q: 1 | 2 | 3 | 4 } | null>(null);
  const effective = sel
    ? sel
    : quarterChoices[0]
      ? { fy: quarterChoices[0].fy, q: quarterChoices[0].q }
      : null;
  const ctx = useQuery(api.ia.getIaImportContext, {});
  const quartersQ = useQuery(api.ia.listIaQuarters, { limit: 20000 });
  const [busy, setBusy] = useState<string | null>(null);

  const runTemplate = async () => {
    if (!effective || !ctx) return;
    setBusy("template");
    try {
      await downloadIaQuarterTemplate(
        effective.fy,
        effective.q,
        ctx.facilities.map((f) => ({
          name: f.name,
          block: f.block,
          phc: f.phc,
          facilityType: f.facilityType,
          ninNumber: f.ninNumber ?? null,
        })),
      );
      toast.success("Quarter template downloaded");
    } catch {
      toast.error("Could not build the template");
    }
    setBusy(null);
  };

  const runQuarterly = async () => {
    if (!effective || !ctx || quartersQ === undefined) return;
    setBusy("quarterly");
    try {
      const prev = previousQuarter(effective.fy, effective.q);
      const key = (fy: string, q: number) => `${fy}|Q${q}`;
      type QuarterList = NonNullable<typeof quartersQ>[number];
      const byFacility = new Map<string, QuarterList[]>();
      for (const q of quartersQ) {
        const list = byFacility.get(q.facilityId) ?? [];
        list.push(q);
        byFacility.set(q.facilityId, list);
      }
      const mkScores = (): Record<"nqas" | "kayakalp" | "eco", number | null> => ({
        nqas: null,
        kayakalp: null,
        eco: null,
      });
      const rows: IaQuarterReportRow[] = ctx.facilities.map((f) => {
        const rowsF = byFacility.get(f.id) ?? [];
        const scores: Record<string, Record<"nqas" | "kayakalp" | "eco", number | null>> = {};
        const remarks: Record<string, Record<"nqas" | "kayakalp" | "eco", string | null>> = {};
        const locked: Record<string, boolean> = {};
        for (const keyP of [prev, effective]) {
          const k = key(keyP.fy, keyP.q);
          scores[k] = mkScores();
          remarks[k] = { nqas: null, kayakalp: null, eco: null };
        }
        for (const row of rowsF) {
          const k = key(row.fy, row.quarter);
          if (!(k in scores)) continue;
          scores[k].nqas = row.nqasIaScore;
          scores[k].kayakalp = row.kayakalpIaScore;
          scores[k].eco = row.ecoFriendlyScore;
          remarks[k].nqas = row.nqasRemark;
          remarks[k].kayakalp = row.kayakalpRemark;
          remarks[k].eco = row.ecoRemark;
          locked[k] = !!row.lockedAt;
        }
        return {
          facilityId: f.id,
          name: f.name,
          block: f.block,
          phc: f.phc,
          facilityType: f.facilityType,
          scores,
          remarks,
          locked,
        };
      });
      await downloadIaQuarterlyReport({
        generatedBy: ctx.me.name ?? "user",
        generatedAt: new Date(),
        period: effective,
        periods: [prev, effective].sort(
          (a, b) => quarterOrder(a.fy, a.q) - quarterOrder(b.fy, b.q),
        ),
        rows,
      });
      toast.success("IA Quarterly Report downloaded");
    } catch {
      toast.error("Could not build the quarterly report");
    }
    setBusy(null);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Quarter</p>
          <Select
            value={effective ? `${effective.fy}:Q${effective.q}` : "none"}
            onValueChange={(v) => {
              const hit = quarterChoices.find((qq) => `${qq.fy}:${qq.q}` === v);
              if (hit) setSel({ fy: hit.fy, q: hit.q });
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Pick a quarter" />
            </SelectTrigger>
            <SelectContent>
              {quarterChoices.map((qq) => (
                <SelectItem key={`${qq.fy}:${qq.q}`} value={`${qq.fy}:${qq.q}`} className="text-xs">
                  {formatFyQuarter(qq.fy, qq.q)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2" disabled={!effective || !ctx || busy === "template"} onClick={() => void runTemplate()}>
          {busy === "template" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Download quarter template
        </Button>
        <Button
          className="gap-2"
          disabled={!effective || !ctx || quartersQ === undefined || busy === "quarterly"}
          onClick={() => void runQuarterly()}
        >
          {busy === "quarterly" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export IA Quarterly Report (Excel)
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        The template lists every master-list facility with its mapped key, Block, PHC, Type and the FY/Quarter filled
        in — fill the score columns and re-import it. The quarterly report prints the quarter and its previous one side
        by side per tracker, with a summary sheet (reported counts, locks).
      </p>
    </div>
  );
}
