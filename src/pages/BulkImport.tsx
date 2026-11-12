import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/AppShell";
import { IaImportWizard } from "@/components/imports/IaImportWizard";
import { SaqshamImportWizard } from "@/components/imports/SaqshamImportWizard";
import { SaqshamMappingPanel } from "@/components/admin/SaqshamMappingPanel";
import { IaBatchReportWorker } from "@/pages/IaImport";
import { BatchReportWorker, SaqshamReportDialog } from "@/pages/SaqshamImport";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UniversalFilterBar,
  rowPasses,
  type BarValue,
  type FilterField,
} from "@/components/UniversalFilterBar";
import { detectImportText, type DetectedImport, type ImportKind } from "@/lib/importDetect";
import { downloadLinksTemplate } from "@/lib/linksExport";
import { DEFAULT_LINK_CATEGORIES, DEFAULT_LINK_OWNERS } from "@/lib/linksDefaults";
import { DEFAULT_LINK_FREQUENCIES, DEFAULT_LINK_STATUSES } from "@/lib/links";
import { downloadSampleFile } from "@/lib/saqshamParse";
import { downloadIaQuarterTemplate } from "@/lib/iaReport";
import {
  downloadMasterCsvTemplate,
  downloadMasterTemplate,
  masterImportLists,
} from "@/lib/masterImportTemplate";
import type { MasterRow } from "@/lib/masterColumns";
import {
  BookMarked,
  ClipboardPaste,
  Download,
  Eye,
  FileSpreadsheet,
  FileUp,
  History,
  ListChecks,
  Loader2,
  ShieldCheck,
  Target,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

/* --------------------------------------------------------------------------- */
/* Import types                                                                 */
/* --------------------------------------------------------------------------- */

const TILES: {
  kind: ImportKind;
  name: string;
  blurb: string;
  icon: typeof ShieldCheck;
  tone: string;
  template: string;
}[] = [
  {
    kind: "saqsham",
    name: "SaQsham document status",
    blurb: "Portal status, report group and portal date, previous → new.",
    icon: ShieldCheck,
    tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    template: "Sample",
  },
  {
    kind: "ia",
    name: "Internal Assessment (Quarterly IA)",
    blurb: "NQAS and Kayakalp IA scores by NIN and quarter.",
    icon: Target,
    tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    template: "Quarter template",
  },
  {
    kind: "facility-master",
    name: "Facility master",
    blurb: "Bulk edit the Master List fields (CSV / paste).",
    icon: FileSpreadsheet,
    tone: "bg-muted text-muted-foreground",
    template: "Template",
  },
  {
    kind: "links",
    name: "Links Organiser",
    blurb: "Report and data-collection links, owners and schedules.",
    icon: BookMarked,
    tone: "bg-emerald-500/15 text-emerald-800",
    template: "Template",
  },
];

/* --------------------------------------------------------------------------- */
/* Smart add-data box                                                           */
/* --------------------------------------------------------------------------- */

function SmartAddBox({
  onDetected,
  disabled,
}: {
  onDetected: (kind: ImportKind, source: { text?: string; file?: File }) => void;
  disabled?: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const [choice, setChoice] = useState<{ detected: DetectedImport; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const accept = (text: string) => {
    if (!text.trim()) return;
    const detected = detectImportText(text);
    if (detected.ambiguous) {
      setChoice({ detected, text });
      return;
    }
    if (!detected.kind) {
      toast.error("Could not tell which import this is. Open a tile below and paste there.");
      return;
    }
    toast.success(`Detected: ${detected.label} · ${detected.rows} rows · ${detected.columns} columns`);
    onDetected(detected.kind, { text });
  };

  const readFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (/\.(xlsx|xls)$/.test(name)) {
      // Read the header row only to choose the importer, then hand the FILE to
      // that wizard (it reads the cached values itself).
      try {
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          raw: false,
          defval: "",
        });
        const probe = aoa
          .slice(0, 50)
          .map((r) => (r as unknown[]).join("\t"))
          .join("\n");
        const detected = detectImportText(probe);
        if (detected.kind) {
          toast.success(`Detected: ${detected.label} · ${detected.rows} rows`);
          onDetected(detected.kind, { file });
          return;
        }
        toast.error("Could not tell which import this file is. Open a tile below and upload it there.");
      } catch {
        toast.error("Could not read that Excel file");
      }
      return;
    }
    const text = await file.text();
    accept(text);
  };

  useEffect(() => {
    if (disabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text.trim()) return;
      e.preventDefault();
      accept(text);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  return (
    <>
      <div
        data-testid="smart-add-data"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void readFile(file);
        }}
        className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
          drag ? "border-primary bg-primary/5" : "border-border/70 bg-background/50"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardPaste className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Paste from Excel (Ctrl+V) or drop a file here</p>
            <p className="text-xs text-muted-foreground">
              The import type is recognised from the header row. Nothing is saved until you approve.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="size-3.5" /> Choose file
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv,.tsv,.txt"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readFile(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      <Dialog open={!!choice} onOpenChange={(o) => !o && setChoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Which import is this?</DialogTitle>
            <DialogDescription>
              The header row matches more than one import. Pick the one you are updating.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {TILES.map((t) => (
              <Button
                key={t.kind}
                variant="outline"
                className="justify-start gap-2"
                onClick={() => {
                  const text = choice?.text ?? "";
                  setChoice(null);
                  onDetected(t.kind, { text });
                }}
              >
                <t.icon className="size-4" /> {t.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* --------------------------------------------------------------------------- */
/* Import history                                                               */
/* --------------------------------------------------------------------------- */

function istStamp(ms: number): string {
  const d = new Date(ms + 5.5 * 3_600_000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function sourceLabel(b: { fileName: string; rowsTotal: number }): string {
  const name = (b.fileName ?? "").trim();
  if (!name || /^pasted/i.test(name) || name === "Pasted data") {
    return `Pasted · ${b.rowsTotal} row${b.rowsTotal === 1 ? "" : "s"}`;
  }
  return name;
}

function UnifiedImportHistory() {
  const [bar, setBar] = useState<BarValue>({ barKeys: ["kind", "status"], filters: [], match: "all" });
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<{ batchId: string; rows: { rowNo: number; reason: string }[] } | null>(null);
  const [reportBatch, setReportBatch] = useState<Id<"importBatches"> | null>(null);
  const [viewBatch, setViewBatch] = useState<Id<"importBatches"> | null>(null);
  const navigate = useNavigate();

  const batches = useQuery(api.imports.listImportBatches, { limit: 100 });
  const undoSaqsham = useMutation(api.imports.undoSaqshamBatch);
  const undoIa = useMutation(api.ia.undoIaBatch);

  const fields: FilterField[] = useMemo(
    () => [
      {
        key: "kind",
        label: "Type",
        type: "select",
        group: "Import",
        onThisPage: true,
        options: [
          { value: "saqsham", label: "SaQsham status" },
          { value: "ia", label: "Internal Assessment" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        group: "Import",
        onThisPage: true,
        options: [
          { value: "applied", label: "Applied" },
          { value: "undone", label: "Undone" },
        ],
      },
      {
        key: "by",
        label: "Imported by",
        type: "text",
        group: "Import",
      },
    ],
    [],
  );

  const rowValue = (b: NonNullable<typeof batches>[number], key: string): unknown => {
    if (key === "kind") return b.kind;
    if (key === "status") return b.status;
    if (key === "by") return b.importedByName ?? "";
    return "";
  };

  const shown = (batches ?? []).filter((b) => {
    if (!rowPasses(bar.filters, bar.match, (key) => rowValue(b, key))) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return `${b.fileName} ${b.importedByName ?? ""}`.toLowerCase().includes(needle);
  });

  const runUndo = async (batchId: string, kind: string) => {
    setBusy(batchId);
    try {
      const res =
        kind === "ia"
          ? await undoIa({ batchId: batchId as Id<"importBatches"> })
          : await undoSaqsham({ batchId: batchId as Id<"importBatches"> });
      const conflictCount = (res as { conflicts?: { reason: string }[] }).conflicts?.length ?? 0;
      if (conflictCount > 0) {
        setConflicts({
          batchId,
          rows: (res.conflicts as { rowNo: number; reason: string }[]).map((c) => ({
            rowNo: c.rowNo,
            reason: c.reason,
          })),
        });
        toast.warning(`Restored ${res.restored} row(s); ${conflictCount} skipped (edited since the import)`);
      } else {
        toast.success(`Import undone — ${res.restored} row(s) restored.`);
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-72">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a file or a user"
            className="h-9 text-xs"
            aria-label="Search import history"
          />
        </div>
      </div>
      <UniversalFilterBar
        pageKey="bulkimport.history"
        fields={fields}
        value={bar}
        onChange={setBar}
        summary={`Showing ${shown.length} of ${batches.length} imports`}
      />

      {shown.length === 0 ? (
        <Card className="glass">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {batches.length === 0 ? "No imports yet." : "No import matches the current filters."}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-auto rounded-xl border border-border/60">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-muted/95 backdrop-blur">
              <tr>
                {["When", "By", "Type", "Source", "Result", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="border-b border-border/60 px-3 py-2 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((b) => {
                const parts = [
                  b.rowsUpdated > 0 ? `${b.rowsUpdated} updated` : "",
                  b.rowsNoChange > 0 ? `${b.rowsNoChange} unchanged` : "",
                  b.rowsSkipped > 0 ? `${b.rowsSkipped} skipped` : "",
                  b.rowsFailed > 0 ? `${b.rowsFailed} failed` : "",
                ].filter(Boolean);
                const undone = b.status === "undone";
                const nothingWritten = b.rowsUpdated === 0;
                return (
                  <tr key={b._id} className="border-b border-border/40 align-top">
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">{istStamp(b.importedAt)}</td>
                    <td className="px-3 py-2">{b.importedByName ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {b.kind === "ia" ? "Internal Assessment" : "SaQsham status"}
                      </Badge>
                    </td>
                    <td className="max-w-56 truncate px-3 py-2" data-tip={b.fileName}>
                      {sourceLabel(b)}
                    </td>
                    <td className="px-3 py-2">
                      {parts.length ? parts.join(" · ") : "No change"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="secondary"
                        className={
                          undone
                            ? "bg-muted text-muted-foreground"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        }
                      >
                        {undone ? "Undone" : "Applied"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => setReportBatch(b._id)}>
                          <Download className="size-3.5" /> Report
                        </Button>
                        {b.kind !== "ia" && (
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => setViewBatch(b._id)}>
                            <Eye className="size-3.5" /> View
                          </Button>
                        )}
                        {b.rowsUpdated > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={() => navigate(`/facilities?upd=any&updbatch=${encodeURIComponent(String(b._id))}`)}
                          >
                            View facilities
                          </Button>
                        )}
                        {undone ? (
                          <span className="text-[10px] text-muted-foreground">Undo unavailable: already undone</span>
                        ) : nothingWritten ? (
                          <span className="text-[10px] text-muted-foreground">Undo unavailable: nothing was written</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            data-tip="Rows edited after the import are skipped as conflicts"
                            disabled={busy === String(b._id)}
                            onClick={() => void runUndo(String(b._id), b.kind)}
                          >
                            {busy === String(b._id) ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Undo2 className="size-3.5" />
                            )}
                            Undo
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
        (() => {
          const batch = batches.find((b) => b._id === reportBatch);
          if (!batch) return null;
          const commonProps = {
            batchId: reportBatch,
            fileName: sourceLabel(batch),
            importedByName: batch.importedByName ?? "",
            summary: {
              updated: batch.rowsUpdated,
              noChange: batch.rowsNoChange,
              skipped: batch.rowsSkipped,
              failed: batch.rowsFailed,
            },
            onDone: () => {
              setReportBatch(null);
              toast.success("Report downloaded");
            },
            onError: (message: string) => {
              setReportBatch(null);
              toast.error(message);
            },
          };
          return batch.kind === "ia" ? (
            <IaBatchReportWorker {...commonProps} />
          ) : (
            <SaqshamReportLoader {...commonProps} />
          );
        })()}
      <SaqshamReportDialog batchId={viewBatch} onClose={() => setViewBatch(null)} />
    </div>
  );
}

function SaqshamReportLoader(props: {
  batchId: Id<"importBatches">;
  fileName: string;
  importedByName: string;
  summary: { updated: number; noChange: number; skipped: number; failed: number };
  onDone: () => void;
  onError: (message: string) => void;
}) {
  return <BatchReportWorker {...props} />;
}

/* --------------------------------------------------------------------------- */
/* Facility CSV import (kept in place — same rules, same mutation)              */
/* --------------------------------------------------------------------------- */

function FacilityCsvImport({ initialCsv = "" }: { initialCsv?: string }) {
  const [csv, setCsv] = useState(initialCsv);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    total: number;
    errors: string[];
    headers?: string[];
    skippedDuplicates?: number;
    skippedJunk?: number;
  } | null>(null);
  const importMutation = useMutation(api.ops.bulkImportFacilitiesV2);
  const seedNocDates = useMutation(api.nocSeed.seedNocIssueDates);
  const listRows = useQuery(api.ops.listFacilityRowsFast, {});

  useEffect(() => {
    if (initialCsv) setCsv(initialCsv);
  }, [initialCsv]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const runImport = async () => {
    if (!csv.trim()) {
      toast.error("Paste CSV content or choose a file first");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await importMutation({ csv });
      try {
        const noc = await seedNocDates({ csv });
        if (noc.seeded > 0)
          toast.success(`Imported ${res.created} of ${res.total} rows · seeded ${noc.seeded} NOC issue date(s)`);
        else toast.success(`Imported ${res.created} of ${res.total} rows`);
      } catch {
        toast.success(`Imported ${res.created} of ${res.total} rows`);
      }
      setResult(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
    setBusy(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="glass rounded-xl p-4 lg:col-span-2">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Label>CSV content</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={runImport} disabled={busy || !csv.trim()} className="gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Import Facilities
            </Button>
            <label className="glass-input inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
              <FileUp className="size-4" />
              Choose file
              <input
                type="file"
                accept=".csv,.txt,.tsv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </div>
        </div>
        <Textarea
          className="min-h-56 font-mono text-xs"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="Paste CSV content here — the first row must be the header"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          First row must be a header. NIN Number is the only duplicate key; missing blocks are created automatically.
        </p>
        {result && (
          <div className="glass-strong mt-4 rounded-lg p-3 text-sm">
            <p className="font-medium">
              Imported {result.created} of {result.total} rows
              {result.skippedDuplicates ? ` · ${result.skippedDuplicates} duplicate(s) skipped` : ""}
              {result.skippedJunk ? ` · ${result.skippedJunk} template row(s) ignored` : ""}
              {result.errors.length > 0 ? ` · ${result.errors.length} line(s) need attention` : ""}
            </p>
            {result.headers && result.headers.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Detected columns: {result.headers.filter(Boolean).join(", ")}
              </p>
            )}
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5 text-xs text-destructive">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="glass rounded-xl p-4 text-sm">
        <p className="mb-2 font-medium">Notes</p>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>NIN Number is the only duplicate key. Re-importing the same file is safe.</li>
          <li>Missing blocks are created automatically.</li>
          <li>Entry users only import into their assigned blocks; other rows are reported.</li>
        </ul>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* The page                                                                     */
/* --------------------------------------------------------------------------- */

type BulkTab = "import" | "mapping" | "history";

function tabFromQuery(value: string | null): BulkTab {
  return value === "mapping" || value === "history" ? value : "import";
}

export default function BulkImport({
  initialKind = null,
}: {
  initialKind?: ImportKind | null;
}) {
  const listRows = useQuery(api.ops.listFacilityRowsFast, {});
  const batches = useQuery(api.imports.listImportBatches, { limit: 100 });
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const role = listRows?.me.appRole;
  const loading = listRows === undefined;
  const canImport = loading || role === "admin" || role === "entry";
  const isAdmin = role === "admin";

  const [tab, setTab] = useState<BulkTab>(() => tabFromQuery(searchParams.get("tab")));
  const [mappingFocus, setMappingFocus] = useState("");
  const [active, setActive] = useState<ImportKind | null>(initialKind);
  const [source, setSource] = useState<{ text?: string; file?: File } | null>(null);
  /** Bumped to remount the wizard when a second paste arrives in one session. */
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    setTab(tabFromQuery(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (listRows && !canImport) {
      setActive(null);
      setSource(null);
    }
  }, [canImport, listRows]);

  const changeTab = (next: BulkTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === "import") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const openMapping = (portal: string) => {
    setMappingFocus(portal);
    changeTab("mapping");
  };

  const open = (kind: ImportKind, next: { text?: string; file?: File } | null = null) => {
    if (!canImport) {
      toast.error("Bulk Import is available to the State Admin and District Editors only");
      return;
    }
    if (kind === "facility-master" && !isAdmin) {
      toast.error("The facility master import is available to the State Admin only");
      return;
    }
    if (kind === "links") {
      navigate("/links?import=1");
      return;
    }
    setActive(kind);
    setSource(next);
    setRunId((n) => n + 1);
  };

  const lastLine = (kind: "saqsham" | "ia") => {
    const l = (batches ?? []).find((b) => b.kind === kind);
    if (!l) return "Last import: none yet";
    const d = new Date(l.importedAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `Last import ${d}${l.rowsUpdated ? ` · ${l.rowsUpdated} rows` : ""}`;
  };

  const activeTile = TILES.find((t) => t.kind === active) ?? null;
  const wizardOpen = active !== null;

  return (
    <AppShell
      title="Bulk Import"
      subtitle="Update many facilities at once, or keep the portal status mapping current. Nothing is saved until you approve."
    >
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value !== "mapping") setMappingFocus("");
          changeTab(value as BulkTab);
        }}
        className="space-y-4"
      >
        <TabsList className="grid h-auto w-full max-w-md grid-cols-3 gap-1 p-1">
          <TabsTrigger value="import" className="gap-1.5 text-xs sm:text-sm">
            <Upload className="size-3.5" /> Import
          </TabsTrigger>
          <TabsTrigger value="mapping" className="gap-1.5 text-xs sm:text-sm">
            <ListChecks className="size-3.5" /> Status mapping
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
            <History className="size-3.5" /> History
            {batches?.length ? (
              <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{batches.length}</span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-0 space-y-4">
          {loading ? (
            <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading Bulk Import…
            </p>
          ) : !canImport ? (
            <Card className="glass max-w-lg">
              <CardContent className="flex items-start gap-3 p-6 text-sm text-muted-foreground">
                <span>Import is available to the State Admin and District Editors only. You can still view Status mapping and History.</span>
              </CardContent>
            </Card>
          ) : (
            <>
              {!wizardOpen && (
                <SmartAddBox onDetected={(kind, src) => open(kind, src)} disabled={!canImport} />
              )}

              {/* Import types — compact tiles. While a wizard is open they collapse to
                  one slim line so the review gets the full height. */}
              {!wizardOpen ? (
                <div className="grid gap-3 lg:grid-cols-4">
                  {TILES.filter((t) => t.kind !== "facility-master" || isAdmin).map((t) => (
                    <Card key={t.kind} className="glass">
                      <CardContent className="flex h-full flex-col gap-2 p-4">
                        <div className="flex items-center gap-2">
                          <span className={`flex size-8 items-center justify-center rounded-lg ${t.tone}`}>
                            <t.icon className="size-4" />
                          </span>
                          <h3 className="min-w-0 flex-1 text-sm font-semibold">{t.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.blurb}</p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {t.kind === "facility-master"
                            ? `${listRows?.rows.length ?? "…"} facilities in the master list`
                            : t.kind === "links"
                              ? "Open the register · paste or upload the sheet"
                              : lastLine(t.kind)}
                        </p>
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                          <Button size="sm" className="gap-1.5" onClick={() => open(t.kind)}>
                            <Upload className="size-3.5" /> Start import
                          </Button>
                          <TemplateMenu
                            kind={t.kind}
                            label={t.template}
                            rows={listRows?.rows ?? []}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Importing:</span>
                  <span className="text-sm font-semibold">{activeTile?.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto gap-1"
                    onClick={() => {
                      setActive(null);
                      setSource(null);
                    }}
                  >
                    <X className="size-3.5" /> Change import type
                  </Button>
                </div>
              )}

              {active === "saqsham" && (
                <SaqshamImportWizard
                  key={`saqsham-${runId}`}
                  initialText={source?.text ?? null}
                  initialFile={source?.file ?? null}
                  onOpenList={() => navigate("/facilities")}
                  onOpenHistory={() => changeTab("history")}
                  onOpenMapping={openMapping}
                />
              )}
              {active === "ia" && (
                <IaImportWizard
                  key={`ia-${runId}`}
                  initialText={source?.text ?? null}
                  initialFile={source?.file ?? null}
                  onOpenList={() => navigate("/facilities")}
                />
              )}
              {isAdmin && active === "facility-master" && (
                <FacilityCsvImport key={`master-${runId}`} initialCsv={source?.text ?? ""} />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="mapping" className="mt-0">
          <SaqshamMappingPanel key={mappingFocus || "status-mapping"} initialSearch={mappingFocus} />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <UnifiedImportHistory />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function TemplateMenu({
  kind,
  label,
  rows,
}: {
  kind: ImportKind;
  label: string;
  rows: MasterRow[];
}) {
  const run = (fn: () => void | Promise<void>) => {
    void Promise.resolve(fn()).catch(() => toast.error("Could not build the template"));
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Download className="size-3.5" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Download a template</DropdownMenuLabel>
        {kind === "saqsham" && (
          <DropdownMenuItem onClick={() => run(downloadSampleFile)}>
            SaQsham sample (rows + headers)
          </DropdownMenuItem>
        )}
        {kind === "ia" && (
          <>
            <DropdownMenuItem
              onClick={() => run(() => downloadIaQuarterTemplate("2026-27", 2, []))}
            >
              Quarter template (blank, current quarter)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => run(() => downloadIaQuarterTemplate("2026-27", 2, rows as never))}
            >
              Quarter template (every facility pre-filled)
            </DropdownMenuItem>
          </>
        )}
        {kind === "links" && (
          <DropdownMenuItem
            onClick={() => run(() => downloadLinksTemplate({
              categories: DEFAULT_LINK_CATEGORIES.map((c) => c.name),
              owners: [...DEFAULT_LINK_OWNERS],
              statuses: DEFAULT_LINK_STATUSES,
              frequencies: DEFAULT_LINK_FREQUENCIES,
              fileName: "Links Organiser template",
            }))}
          >
            Links Organiser template
          </DropdownMenuItem>
        )}
        {kind === "facility-master" && (
          <>
            <DropdownMenuItem
              onClick={() => run(() => downloadMasterTemplate("blank", [], masterImportLists(rows), "NQAS Tracker"))}
            >
              Blank template
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => run(() => downloadMasterTemplate("current", rows, masterImportLists(rows), "NQAS Tracker"))}
            >
              Current data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadMasterCsvTemplate(masterImportLists(rows))}>
              CSV template
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
