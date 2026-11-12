/**
 * SaQsham DOCUMENT STATUS IMPORT — the page.
 *
 * Route: /bulk-import/saqsham (the Bulk Import page's SaQsham card; the old
 * /import/saqsham URL redirects here). Two tabs: the wizard, and the Import
 * history (batch list with per-batch report download and Undo).
 *
 * Access: State Admin and District Editor (role "entry"). Viewers are denied
 * here AND on the server (imports.getSaqshamImportContext / applySaqshamBatch).
 */

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/AppShell";
import { SaqshamImportWizard } from "@/components/imports/SaqshamImportWizard";
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
import { toast } from "sonner";
import { Download, Eye, FileUp, History, Loader2, ShieldAlert, Undo2 } from "lucide-react";
// The history report is the SAME workbook the import result screen offers,
// rebuilt from the stored batch rows with the shared column model.
import {
  downloadImportReport,
  reportCounts,
  simpleReportRows,
  updatedReportRows,
  type ReportRow,
} from "@/lib/saqshamReport";
import type {
  CleanedRow,
  MatchMethod,
  PreviewRow,
  PreviewState,
  RowChange,
} from "@/lib/saqshamImport";

/** Rebuild a PreviewRow from a stored importRows document so the SAME column
 *  model (saqshamPreviewColumns) can render the batch's Excel report.
 *  (Also used by the Bulk Import page's unified history.) */
export function importRowToPreview(r: {
  rowNo: number;
  facilityId?: string | null;
  matchMethod: string;
  confidence: number;
  result: string;
  error?: string;
  raw?: unknown;
  cleaned?: unknown;
  oldValue?: unknown;
  facilityName?: string;
  facilityBlock?: string;
  facilityPhc?: string;
  notes?: string;
}): PreviewRow {
  type DecisionCleaned = Partial<
    Pick<
      CleanedRow,
      "applicationNo" | "name" | "category" | "facilityType" | "statusRaw"
    > & {
      portalFacilityRaw?: string;
      facilityTypeKnown?: boolean;
      report?: string | null;
      keepAsIs?: boolean;
      departments?: string[];
      appliedDate?: string | null;
      lastUpdateDate?: string | null;
      lastUpdateBy?: string | null;
      resultDeclared?: boolean;
      differentScope?: boolean;
      warnings?: string[];
      assessmentType?: string;
      assessmentMode?: string;
      state?: string;
      district?: string;
    }
  >;
  const c = (r.cleaned ?? {}) as DecisionCleaned;
  const old = (r.oldValue ?? null) as {
    saqshamStatusRaw?: string | null;
    generalDocStatus?: string | null;
    documentsStatusReport?: string | null;
  } | null;
  const wasUpdated = r.result === "updated";
  const change: RowChange = wasUpdated
    ? old?.saqshamStatusRaw || old?.generalDocStatus
      ? "changed"
      : "new"
    : r.result === "no_change" || r.result === "undone"
      ? "same"
      : "none";
  const state: PreviewState =
    wasUpdated
      ? "ready"
      : r.result === "no_change"
        ? "no_change"
        : r.result === "undone"
          ? "no_change"
          : r.result === "failed"
            ? "error"
            : "skipped";
  const method = r.matchMethod as MatchMethod;
  const cleanedSource = r.raw ?? {};
  return {
    rowNo: r.rowNo,
    sourceRowNo: r.rowNo,
    cleaned: {
      rowNo: r.rowNo,
      sourceRowNo: r.rowNo,
      raw: cleanedSource as Record<string, unknown>,
      applicationNo: c.applicationNo ?? "",
      assessmentType: c.assessmentType ?? "",
      portalFacilityRaw: c.portalFacilityRaw ?? c.name ?? "",
      name: c.name ?? "",
      category: c.category ?? "",
      facilityType: c.facilityType ?? "",
      facilityTypeKnown: c.facilityTypeKnown ?? true,
      statusRaw: c.statusRaw ?? "",
      reportStatus: c.report ?? null,
      resultDeclared: !!c.resultDeclared,
      appliedDepartments: {
        raw: "",
        statedCount: null,
        departments: c.departments ?? [],
        ok: true,
        note: null,
      },
      appliedDate: c.appliedDate ?? null,
      lastUpdate: {
        raw: "",
        date: c.lastUpdateDate ?? null,
        updatedBy: c.lastUpdateBy ?? null,
      },
      state: c.state ?? "",
      district: c.district ?? "",
      differentScope: !!c.differentScope,
      helper: { facilityType: "", block: "", phc: "", name: "" },
      assessmentMode: c.assessmentMode ?? "",
      warnings: c.warnings ?? [],
    },
    match: r.facilityId
      ? { status: "matched", method, confidence: r.confidence, facilityId: r.facilityId }
      : { status: "unmatched", candidates: [] },
    facilityId: r.facilityId ?? null,
    facilityName: r.facilityName ?? c.name ?? "",
    facilityBlock: r.facilityBlock ?? "",
    facilityPhc: r.facilityPhc ?? "",
    facilityType: c.facilityType ?? "",
    method,
    confidence: r.confidence,
    currentStatus: old?.saqshamStatusRaw ?? old?.generalDocStatus ?? null,
    currentReport: old?.documentsStatusReport ?? null,
    currentPortalUpdatedOn: null,
    keptResultDeclared: false,
    movedBack: false,
    newStatus: c.statusRaw ?? "",
    newReport: c.report ?? null,
    keepAsIs: c.keepAsIs === true,
    change,
    state,
    include: wasUpdated,
    unmappedStatus: false,
    stale: false,
    olderApplication: false,
    olderOfApplicationNo: null,
    differentScope: !!c.differentScope,
    warnings: c.warnings ?? [],
    overrideNote: r.notes ?? r.error,
    optional: {
      assessmentMode: null,
      appliedDepartments: null,
      appliedDate: null,
      assessmentType: null,
    },
  };
}

/** Child that fetches one batch's rows and writes the Excel report once they
 *  arrive — keeps the "skip" pattern out of the table component. */
export function BatchReportWorker({
  batchId,
  onDone,
  onError,
}: {
  batchId: Id<"importBatches">;
  fileName?: string;
  importedByName?: string;
  summary?: { updated: number; noChange: number; skipped: number; failed: number };
  statusMap?: { portal: string; report: string }[];
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const report = useQuery(api.imports.getSaqshamReport, { batchId });
  const started = useRef(false);
  useEffect(() => {
    if (!report || started.current) return;
    started.current = true;
    downloadImportReport({
      fileName: report.fileName,
      generatedBy: report.importedByName,
      generatedAt: new Date(),
      summary: {
        updated: report.rowsUpdated,
        noChange: report.rowsNoChange,
        skipped: report.rowsSkipped,
        failed: report.rowsFailed,
      },
      statusMap: report.statusMap,
      reportRows: (report.reportRows ?? null) as ReportRow[] | null,
      rowsTotal: report.rowsTotal,
    })
      .then(onDone)
      .catch(() => onError("Could not build the report"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);
  return (
    <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Building the report…
    </p>
  );
}

/** View the same immutable snapshot without downloading it. */
export function SaqshamReportDialog({
  batchId,
  onClose,
}: {
  batchId: Id<"importBatches"> | null;
  onClose: () => void;
}) {
  const report = useQuery(
    api.imports.getSaqshamReport,
    batchId ? { batchId } : "skip",
  );
  const rows = (report?.reportRows ?? null) as ReportRow[] | null;
  const counts = rows ? reportCounts(rows) : null;
  const updated = rows ? updatedReportRows(rows) : [];
  const other = rows ? simpleReportRows(rows) : [];
  return (
    <Dialog open={!!batchId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import report · {report?.fileName ?? "…"}</DialogTitle>
          <DialogDescription>
            Read from the snapshot saved at Apply, not from today’s facility data.
          </DialogDescription>
        </DialogHeader>
        {!report ? (
          <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : !rows ? (
          <p className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm">
            Detail not stored for this import.
          </p>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Rows updated", (counts?.Updated ?? 0) + (counts?.New ?? 0)],
                ["No change", counts?.["No change"] ?? 0],
                ["Needs decision", (counts?.["Needs decision"] ?? 0) + (counts?.["Can't match"] ?? 0)],
                ["Skipped / failed", (counts?.Skipped ?? 0) + (counts?.Failed ?? 0)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border/60 bg-muted/20 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
                  <p className="text-lg font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            {updated.length > 0 && (
              <ReportTable title="Updated" rows={updated} />
            )}
            {other.length > 0 && <ReportTable title="Other rows" rows={other} />}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void downloadImportReport({
                  fileName: report.fileName,
                  generatedBy: report.importedByName,
                  generatedAt: new Date(),
                  summary: {
                    updated: report.rowsUpdated,
                    noChange: report.rowsNoChange,
                    skipped: report.rowsSkipped,
                    failed: report.rowsFailed,
                  },
                  statusMap: report.statusMap,
                  reportRows: rows,
                  rowsTotal: report.rowsTotal,
                })
              }
            >
              <Download className="size-3.5" /> Download Excel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportTable({ title, rows }: { title: string; rows: ReportRow[] }) {
  return (
    <div>
      <h4 className="mb-1 font-semibold">{title} · {rows.length}</h4>
      <div className="overflow-auto rounded-md border border-border/60">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-muted/60">
            <tr>
              {["Row", "Application No", "Portal name", "Matched facility", "Facility type", "PHC", "Block", "Match", "Previous status", "New status", "Previous report", "New report", "Previous portal update", "New portal update", "Application", "Mode", "Applied by", "Applied at"].map((head) => (
                <th key={head} className="px-2 py-1 font-semibold whitespace-nowrap">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowNo} className="border-t border-border/40">
                <td className="px-2 py-1 tabular-nums">{row.rowNo}</td>
                <td className="px-2 py-1">{row.applicationNo}</td>
                <td className="px-2 py-1">{row.portalName}</td>
                <td className="px-2 py-1">{row.matchedFacility}</td>
                <td className="px-2 py-1">{row.facilityType}</td>
                <td className="px-2 py-1">{row.phc}</td>
                <td className="px-2 py-1">{row.block}</td>
                <td className="px-2 py-1">{row.match}</td>
                <td className="px-2 py-1">{row.previousStatus}</td>
                <td className="px-2 py-1">{row.newStatus}</td>
                <td className="px-2 py-1">{row.previousReport}</td>
                <td className="px-2 py-1">{row.newReport}</td>
                <td className="px-2 py-1">{row.previousPortalUpdate}</td>
                <td className="px-2 py-1">{row.newPortalUpdate}</td>
                <td className="px-2 py-1">{row.application}</td>
                <td className="px-2 py-1">{row.mode}</td>
                <td className="px-2 py-1">{row.appliedBy}</td>
                <td className="px-2 py-1 whitespace-nowrap">{new Date(row.appliedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ImportHistory() {
  const batches = useQuery(api.imports.listImportBatches, { limit: 50 });
  const undo = useMutation(api.imports.undoSaqshamBatch);
  const [busy, setBusy] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<{ batchId: string; rows: { rowNo: number; reason: string }[] } | null>(null);
  const [reportBatch, setReportBatch] = useState<Id<"importBatches"> | null>(null);
  const [viewBatch, setViewBatch] = useState<Id<"importBatches"> | null>(null);

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

  const downloadBatch = (batchId: string) => {
    const batch = batches?.find((b) => String(b._id) === batchId);
    if (!batch) return;
    setReportBatch(batch._id);
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
          No SaQsham imports yet. Every confirmed import is listed here with who / when / file name and an Undo button.
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
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {new Date(b.importedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="px-3 py-2 text-xs">{b.importedByName ?? "—"}</td>
                <td className="max-w-48 truncate px-3 py-2 text-xs">{b.fileName}</td>
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
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => downloadBatch(String(b._id))}>
                      <Download className="size-3.5" /> Report
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => setViewBatch(b._id)}>
                      <Eye className="size-3.5" /> View
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

      {/* The "Report" button builds the batch's Excel workbook (the SAME column
          model as the preview) once the batch rows arrive. */}
      {reportBatch && (
        <BatchReportWorker
          batchId={reportBatch}
          onDone={() => {
            setReportBatch(null);
            toast.success("Report downloaded");
          }}
          onError={(message) => {
            setReportBatch(null);
            toast.error(message);
          }}
        />
      )}
      <SaqshamReportDialog batchId={viewBatch} onClose={() => setViewBatch(null)} />
    </>
  );
}

export default function SaqshamImport() {
  const listRows = useQuery(api.ops.listFacilityRowsFast, {});
  const navigate = useNavigate();
  const [tab, setTab] = useState("import");
  const role = listRows?.me.appRole;
  const allowed = role === "admin" || role === "entry";

  return (
    <AppShell
      title="SaQsham document status import"
      subtitle="Nothing is saved until you press Apply."
    >
      {listRows !== undefined && !allowed ? (
        <Card className="glass max-w-lg">
          <CardContent className="flex items-start gap-3 p-6 text-sm text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              The SaQsham document status import is available to the State Admin and District Editors only.
            </span>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-xl border border-border/60 bg-background/60 p-1 sm:w-auto">
            <TabsTrigger value="import" className="gap-1.5 rounded-lg px-3 py-1.5 text-xs">
              <FileUp className="size-3.5" /> Import
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 rounded-lg px-3 py-1.5 text-xs">
              <History className="size-3.5" /> Import history
            </TabsTrigger>
          </TabsList>
          <TabsContent value="import">
            <SaqshamImportWizard
              onOpenList={() => navigate("/facilities")}
              onOpenHistory={() => setTab("history")}
            />
          </TabsContent>
          <TabsContent value="history">
            <ImportHistory />
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}
