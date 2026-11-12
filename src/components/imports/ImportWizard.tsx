// Templated Excel import wizard — one flow shared by the two trackers:
//
//   upload → auto-detect + map columns → server-validated preview
//          → confirm → summary with a downloadable error report
//
// The wizard never guesses a write: rows come back from the server preflight
// (imports.previewImport) with their status and reason, and only those rows
// the admin confirms in the preview reach an apply pass. Re-importing the
// same sheet twice is always safe (idempotent apply on the server).

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { errorRowsToCsv } from "@/lib/importMatch";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";

export type ImportKind = "saqsham" | "ia";

type Check = {
  rowNo: number;
  status: "valid" | "warning" | "error";
  reasons: string[];
  payload: Record<string, unknown>;
};

type LogicalCol = {
  key: string;
  label: string;
  required: boolean;
  /** Header auto-detection regexes — first match wins. */
  patterns: RegExp[];
};

const COLS: Record<ImportKind, LogicalCol[]> = {
  saqsham: [
    { key: "nin", label: "NIN Number", required: false, patterns: [/nin/i] },
    { key: "name", label: "Facility name", required: true, patterns: [/name of.*facilit/i, /facilit.*name/i, /institution/i, /name/i] },
    { key: "block", label: "Block", required: true, patterns: [/block/i] },
    {
      key: "docStatus",
      label: "SaQsham Documents Status",
      required: true,
      patterns: [/saqsham/i, /documents? status/i, /status/i],
    },
  ],
  ia: [
    { key: "nin", label: "NIN Number", required: false, patterns: [/nin/i] },
    { key: "name", label: "Facility name", required: true, patterns: [/name of.*facilit/i, /facilit.*name/i, /institution/i, /name/i] },
    { key: "block", label: "Block", required: true, patterns: [/block/i] },
    { key: "assessmentDate", label: "Assessment date", required: true, patterns: [/\bdate\b/i] },
    { key: "scorePct", label: "IA %", required: true, patterns: [/ia\s*%|ia%/i, /score/i, /%/] },
    { key: "tracker", label: "Tracker (NQAS / Kayakalp)", required: false, patterns: [/tracker/i, /kayakalp/i, /nqas/i] },
  ],
};

const KIND_COPY: Record<
  ImportKind,
  { title: string; description: string; apply: "applySaqshamImport" | "applyIaImport" }
> = {
  saqsham: {
    title: "SaQsham Documents Status import",
    description:
      "Upload the status sheet downloaded from the SaQsham portal. Rows update each facility's SaQsham Documents Status and its Updated stamp — re-running the same sheet is safe.",
    apply: "applySaqshamImport",
  },
  ia: {
    title: "Internal Assessment import",
    description:
      "Upload the IA sheet (facility, assessment date, IA %). Scores land in the matching FY 2026-27 quarter column and set the facility's latest IA — the engine then flags IA overdue where the cadence has lapsed.",
    apply: "applyIaImport",
  },
};

/** First row with at least two non-empty cells is the header — sheets often
 *  carry a title banner above. */
function pickHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const filled = rows[i].filter((c) => c != null && String(c).trim() !== "");
    if (filled.length >= 2) return i;
  }
  return 0;
}

function autoMap(headers: string[], cols: LogicalCol[]): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  const used = new Set<number>();
  for (const col of cols) {
    // First match wins; already-assigned headers stay free for other columns.
    const idx = headers.findIndex(
      (h, i) =>
        !used.has(i) && col.patterns.some((p) => p.test(String(h ?? ""))),
    );
    map[col.key] = idx >= 0 ? idx : null;
    if (idx >= 0) used.add(idx);
  }
  return map;
}

export function ImportWizard({ kind }: { kind: ImportKind }) {
  const copy = KIND_COPY[kind];
  const cols = COLS[kind];

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<unknown[][]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{
    updated: number;
    errors: { rowNo: number; reason: string }[];
    facilitiesTouched: number;
  } | null>(null);

  // Server-side preflight — reactive: change a column mapping and the
  // preview re-validates itself.
  const mappedRows = useMemo(() => {
    if (rawRows.length === 0 || Object.values(mapping).every((v) => v == null))
      return "skip" as const;
    const dataRows = rawRows.filter(
      (r, i) => i >= headerRow + 1 && r.some((c) => c != null && String(c).trim() !== ""),
    );
    if (dataRows.length === 0) return "skip" as const;
    if (dataRows.length > 1000) return "skip" as const;
    const cell = (r: unknown[], key: string) =>
      mapping[key] == null ? undefined : r[mapping[key]!];
    return {
      kind,
      fileName: fileName ?? "upload.xlsx",
      rows: dataRows.map((r, i) => ({
        rowNo: i + 1,
        nin: cell(r, "nin"),
        name: cell(r, "name"),
        block: cell(r, "block"),
        docStatus: cell(r, "docStatus"),
        assessmentDate: cell(r, "assessmentDate"),
        scorePct: cell(r, "scorePct"),
        tracker: (() => {
          const t = cell(r, "tracker");
          if (t != null && String(t).trim() !== "") return String(t).trim();
          return undefined;
        })(),
      })),
    };
  }, [rawRows, mapping, headerRow, kind, fileName]);

  const preview = useQuery(
    api.imports.previewImport,
    mappedRows === "skip" ? "skip" : { ...mappedRows },
  );

  const apply = useMutation(api.imports[copy.apply]);

  const parseFile = async (file: File) => {
    setParsing(true);
    setResult(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
        raw: true,
      });
      if (!rows.length) {
        toast.error("The first sheet is empty");
        setParsing(false);
        return;
      }
      const hr = pickHeaderRow(rows);
      const headerTexts = (rows[hr] ?? []).map((c) =>
        c == null ? "" : String(c).trim(),
      );
      setFileName(file.name);
      setRawRows(rows);
      setHeaderRow(hr);
      setHeaders(headerTexts);
      setMapping(autoMap(headerTexts, cols));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not read the workbook",
      );
    }
    setParsing(false);
  };

  const missingRequired = cols.filter((c) => c.required && mapping[c.key] == null);
  const checked = (preview?.checks ?? []) as Check[];
  // "Total" must count exactly the rows the server was asked to check —
  // mappedRows drops blank rows, so deriving the total from them keeps the
  // "Import N rows” cap check truthful (a sheet with stray blanks otherwise
  // left the button permanently disabled).
  const mappedTotal = mappedRows === "skip" ? 0 : mappedRows.rows.length;
  const counts = useMemo(
    () => ({
      valid: checked.filter((c) => c.status === "valid").length,
      warning: checked.filter((c) => c.status === "warning").length,
      error: checked.filter((c) => c.status === "error").length,
      total: mappedTotal,
    }),
    [checked, mappedTotal],
  );

  const downloadTemplate = () => {
    // Sample rows + an instructions sheet. (Cell data-validation dropdowns
    // cannot be authored with the community XLSX build — the allowed
    // statuses sheet doubles as the pick list, documented in Step 4 of the
    // changelog.)
    const sample =
      kind === "saqsham"
        ? [
            ["NIN Number", "Facility name", "Block", "SaQsham Documents Status"],
            ["100123", "PHC Alangayam", "Alangayam", "Docx in RQAU login"],
            ["100124", "PHC Jolarpet", "Jolarpet", "Docx forwarded to NHSRC"],
          ]
        : [
            [
              "NIN Number",
              "Facility name",
              "Block",
              "Assessment date",
              "IA %",
              "Tracker",
            ],
            ["100123", "PHC Alangayam", "Alangayam", "21-08-2026", 82, "NQAS"],
            ["100124", "PHC Jolarpet", "Jolarpet", "10-09-2026", 74, "Kayakalp"],
          ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sample);
    ws["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 26 }, { wch: 8 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Import sheet");
    const extra =
      kind === "saqsham"
        ? [
            ["Allowed SaQsham Documents Status values — copy one per row"],
            ...(((preview?.allowedStatuses as string[]) ?? []).map((s) => [s])),
          ]
        : [
            ["Instructions"],
            ["• Dates: dd-mm-yyyy (or pick real date cells in Excel)"],
            ["• IA %: 0–100"],
            ["• Tracker: NQAS or Kayakalp — leave blank for NQAS"],
            ["• Dates in Q1 (Apr-Jun 2026) and Q2 (Jul-Sep 2026) also fill the"],
            ["  quarterly columns; other dates still set the latest IA."],
          ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(extra),
      kind === "saqsham" ? "Allowed statuses" : "Instructions",
    );
    XLSX.writeFile(
      wb,
      kind === "saqsham"
        ? "saqsham-status-import-template.xlsx"
        : "ia-import-template.xlsx",
    );
    toast.success(
      kind === "saqsham"
        ? "SaQsham import template downloaded"
        : "Internal Assessment import template downloaded",
    );
  };

  const downloadErrors = () => {
    if (!result || result.errors.length === 0) return;
    const blob = new Blob([errorRowsToCsv(result.errors)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runApply = async () => {
    if (mappedRows === "skip" || missingRequired.length > 0) return;
    setApplying(true);
    try {
      const res = await apply({ ...mappedRows });
      setResult(res);
      const fixed = res.errors.length;
      toast.success(
        `Imported ${res.updated} update${res.updated === 1 ? "" : "s"} across ${res.facilitiesTouched} facilit${res.facilitiesTouched === 1 ? "y" : "ies"}${fixed ? ` · ${fixed} row${fixed === 1 ? "" : "s"} need attention` : ""}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
    setApplying(false);
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="size-4" /> {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
            <Download className="size-4" /> Template
          </Button>
          <label className="glass-input inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
            {parsing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {fileName ?? "Choose Excel file"}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void parseFile(f);
              }}
            />
          </label>
          {fileName && headers.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {headers.filter(Boolean).length} columns ·{" "}
              {Math.max(0, rawRows.length - headerRow - 1)} data rows
            </Badge>
          )}
        </div>

        {headers.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cols.map((col) => (
              <div key={col.key} className="flex items-center gap-2">
                <span className="w-44 shrink-0 text-xs font-medium">
                  {col.label}
                  {col.required && <span className="text-destructive"> *</span>}
                </span>
                <Select
                  value={mapping[col.key] == null ? "none" : String(mapping[col.key])}
                  onValueChange={(v) =>
                    setMapping((m) => ({
                      ...m,
                      [col.key]: v === "none" ? null : Number(v),
                    }))
                  }
                >
                  <SelectTrigger className="h-9 w-full min-w-44 text-xs">
                    <SelectValue
                      placeholder={
                        mapping[col.key] == null ? "Not mapped" : undefined
                      }
                    />
                    {mapping[col.key] != null && (
                      <span className="truncate">
                        {headers[mapping[col.key]!] || "(blank header)"}
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      — not mapped —
                    </SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={String(i)} className="text-xs">
                        {h || `(column ${i + 1})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {headers.length > 0 && (
          <>
            {missingRequired.length > 0 ? (
              <p className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle className="size-4 shrink-0" />
                Map every required column first:{" "}
                {missingRequired.map((c) => c.label).join(", ")}
              </p>
            ) : mappedRows !== "skip" && (
              <>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="size-3" /> {counts.valid} valid
                  </Badge>
                  {counts.warning > 0 && (
                    <Badge className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="size-3" /> {counts.warning} warning
                      {counts.warning === 1 ? "" : "s"}
                    </Badge>
                  )}
                  <Badge className="gap-1 bg-destructive/15 text-destructive">
                    <XCircle className="size-3" /> {counts.error} error
                    {counts.error === 1 ? "" : "s"}
                  </Badge>
                  <span className="text-muted-foreground tabular-nums">
                    {checked.length} of {counts.total} rows checked
                    (max 1000 per run)
                  </span>
                </div>

                <div className="max-h-80 overflow-auto rounded-lg border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow className="sticky top-0 bg-background">
                        <TableHead className="w-10">#</TableHead>
                        <TableHead className="w-24">Check</TableHead>
                        <TableHead>Row values</TableHead>
                        <TableHead className="min-w-64">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checked.map((c) => (
                        <TableRow key={c.rowNo}>
                          <TableCell className="tabular-nums">{c.rowNo}</TableCell>
                          <TableCell>
                            {c.status === "error" && (
                              <Badge className="gap-1 bg-destructive/15 text-destructive">
                                <XCircle className="size-3" /> error
                              </Badge>
                            )}
                            {c.status === "warning" && (
                              <Badge className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="size-3" /> warning
                              </Badge>
                            )}
                            {c.status === "valid" && (
                              <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="size-3" /> valid
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {Object.entries(c.payload)
                              .filter(
                                ([k, v]) =>
                                  v != null &&
                                  v !== "" &&
                                  !["quarter", "fy", "tracker", "nin"].includes(k),
                              )
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(" · ")}
                          </TableCell>
                          <TableCell className="text-xs">
                            {c.status === "valid" && (
                              <span className="text-muted-foreground">
                                Ready to import
                              </span>
                            )}
                            {c.reasons.length > 0 && (
                              <span
                                className={
                                  c.status === "error"
                                    ? "text-destructive"
                                    : "text-amber-700 dark:text-amber-300"
                                }
                              >
                                {c.reasons.join(" · ")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {checked.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-6 text-center text-muted-foreground"
                          >
                            Checking rows with the server…
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={runApply}
                    disabled={
                      applying ||
                      counts.valid + counts.warning === 0 ||
                      checked.length !== Math.min(1000, Math.max(0, counts.total))
                    }
                    className="gap-2"
                  >
                    {applying ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}
                    Import {counts.valid + counts.warning} row
                    {counts.valid + counts.warning === 1 ? "" : "s"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Only valid and warning rows import — error rows are skipped
                    and listed after the run.
                  </p>
                </div>
              </>
            )}

            {applying && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Writing rows…
              </p>
            )}

            {result && (
              <div className="glass-strong rounded-lg p-3 text-sm">
                <p className="font-medium">
                  {result.updated} update{result.updated === 1 ? "" : "s"} written
                  across {result.facilitiesTouched} facilit
                  {result.facilitiesTouched === 1 ? "y" : "ies"}
                  {result.errors.length > 0 &&
                    ` · ${result.errors.length} row${result.errors.length === 1 ? "" : "s"} skipped`}
                </p>
                {result.errors.length > 0 && (
                  <>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-auto pl-5 text-xs text-destructive">
                      {result.errors.map((e, i) => (
                        <li key={i}>
                          Row {e.rowNo}: {e.reason}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1.5"
                      onClick={downloadErrors}
                    >
                      <Download className="size-3.5" /> Download error report
                    </Button>
                  </>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Safe to re-run: unchanged rows are not written again, and this
                  run is recorded in the import history below.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
