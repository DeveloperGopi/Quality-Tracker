/**
 * EXPORT DIALOG — one dialog before every download.
 *
 *   Scope    : current filtered rows / all rows / selected rows
 *   Columns  : current visible columns / choose groups / all 54 columns
 *   PDF      : paper (A4/A3/Legal), orientation, split-by-group (ON by default)
 *   Extras   : Surveillance Due, Fire NOC Alerts, Gap Closure sheets
 *   Preview  : a miniature of the first printed page-set, so nobody downloads
 *              30 pages to discover the columns are wrong.
 *
 * The dialog only decides WHAT to export and hands a plan back through
 * `onRun`; lib/masterExport does the actual writing.
 */

import { useMemo, useState } from "react";
import {
  Check,
  FileDown,
  FileSpreadsheet,
  FileType2,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  fullExportColumns,
  MASTER_GROUPS,
  type MasterColumn,
} from "@/lib/masterColumns";
import { pdfSections, type PdfMeta, type PdfPaper } from "@/lib/masterExport";

export type ExportFormat = "xlsx" | "pdf" | "csv" | "print";
export type ExportScope = "filtered" | "all";
export type ExportColumnChoice = "visible" | "groups" | "all";

export type ExportPlan = {
  format: ExportFormat;
  scope: ExportScope;
  columns: MasterColumn[];
  pdf: PdfMeta;
  extras: { surveillanceDue: boolean; fireNocAlerts: boolean; gapClosure: boolean };
  /** Part C ⑦: fill the "Recently updated" cells in Excel/PDF (default OFF). */
  markRecent: boolean;
  /** Plain sentence for the Summary sheet and the PDF header. */
  filtersText: string;
};

export function ExportDialog({
  open,
  onOpenChange,
  counts,
  visibleColumns,
  filtersText,
  onRun,
  /** True when highlighting is available (Admin days > 0 ∧ user toggle). */
  hasRecentUpdates = false,
  /** The legend text offered with the marks. */
  recentLegend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: { filtered: number; all: number };
  visibleColumns: MasterColumn[];
  filtersText: string;
  onRun: (plan: ExportPlan) => void;
  hasRecentUpdates?: boolean;
  recentLegend?: string;
}) {
  const [scope, setScope] = useState<ExportScope>("filtered");
  const [choice, setChoice] = useState<ExportColumnChoice>("visible");
  const [groups, setGroups] = useState<string[]>(
    MASTER_GROUPS.map((g) => g.id),
  );
  const [paper, setPaper] = useState<PdfPaper>("a4");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [splitByGroup, setSplitByGroup] = useState(true);
  const [extras, setExtras] = useState({
    surveillanceDue: false,
    fireNocAlerts: false,
    gapClosure: false,
  });
  /** "Mark recently updated cells" — an optional checkbox, default OFF. */
  const [markRecent, setMarkRecent] = useState(false);

  const columns = useMemo(() => {
    if (choice === "visible") return visibleColumns;
    // Part 3: the "All columns" choice IS the Full-data export — EVERY
    // field, including the audit-removed (showInMasterList:false) ones, but
    // never the deprecated Eco trio.
    if (choice === "all") return fullExportColumns();
    return fullExportColumns().filter(
      (c) => c.group === "identity" || groups.includes(c.group),
    );
  }, [choice, visibleColumns, groups]);

  const exportable = columns.filter((c) => c.exportable && c.type !== "action");
  const preview = useMemo(
    () => pdfSections(exportable, paper, splitByGroup)[0],
    [exportable, paper, splitByGroup],
  );

  const run = (f: ExportFormat) => {
    onRun({
      format: f,
      scope,
      columns,
      pdf: { paper, orientation, splitByGroup },
      extras,
      markRecent: hasRecentUpdates && markRecent,
      filtersText,
    });
    onOpenChange(false);
  };

  const scopeCount = scope === "all" ? counts.all : counts.filtered;

  const Option = ({
    id,
    title,
    hint,
    children,
  }: {
    id: string;
    title: string;
    hint?: string;
    children?: React.ReactNode;
  }) => (
    <div className="rounded-xl border border-border/60 p-3">
      <Label htmlFor={id} className="text-sm font-semibold">
        {title}
      </Label>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="size-4" /> Export facility data
          </DialogTitle>
          <DialogDescription>
            Everything you see on screen — same columns, same colours, same order.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {/* ---- Scope ---- */}
          <Option id="scope" title="Rows to export" hint={`${scopeCount} rows will be written`}>
            <RadioGroup
              id="scope"
              value={scope}
              onValueChange={(v) => setScope(v as ExportScope)}
              className="gap-2"
            >
              {([
                ["filtered", `Current filtered rows (${counts.filtered})`],
                ["all", `All rows (${counts.all})`],
              ] as [ExportScope, string][]).map(([value, label]) => (
                <label
                  key={value}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                    scope === value ? "border-primary/50 bg-primary/5" : "border-border/60",
                  )}
                >
                  <RadioGroupItem value={value} />
                  {label}
                </label>
              ))}
            </RadioGroup>
          </Option>

          {/* ---- Columns ---- */}
          <Option id="cols" title="Columns">
            <RadioGroup
              id="cols"
              value={choice}
              onValueChange={(v) => setChoice(v as ExportColumnChoice)}
              className="gap-2"
            >
              <label
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                  choice === "visible" ? "border-primary/50 bg-primary/5" : "border-border/60",
                )}
              >
                <RadioGroupItem value="visible" /> Current visible columns (
                {visibleColumns.filter((c) => c.type !== "action").length})
              </label>
              <label
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                  choice === "groups" ? "border-primary/50 bg-primary/5" : "border-border/60",
                )}
              >
                <RadioGroupItem value="groups" /> Choose groups
              </label>
              <label
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                  choice === "all" ? "border-primary/50 bg-primary/5" : "border-border/60",
                )}
              >
                <RadioGroupItem value="all" /> Full data — all {" "}
                {fullExportColumns().length} columns
              </label>
            </RadioGroup>

            {choice === "groups" && (
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {MASTER_GROUPS.map((g) => (
                  <label
                    key={g.id}
                    className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm"
                  >
                    <Checkbox
                      checked={groups.includes(g.id)}
                      onCheckedChange={(v) =>
                        setGroups((prev) =>
                          v === true ? [...prev, g.id] : prev.filter((x) => x !== g.id),
                        )
                      }
                    />
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: g.tint.hex }}
                    />
                    <span className="truncate">{g.label}</span>
                  </label>
                ))}
              </div>
            )}
          </Option>

          {/* ---- PDF options ---- */}
          <Option id="pdf" title="PDF options" hint="Only used for the PDF export">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Paper size</p>
                <RadioGroup
                  value={paper}
                  onValueChange={(v) => setPaper(v as PdfPaper)}
                  className="gap-1"
                >
                  {(["a4", "a3", "legal"] as PdfPaper[]).map((p) => (
                    <label
                      key={p}
                      className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm uppercase"
                    >
                      <RadioGroupItem value={p} /> {p}
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Orientation</p>
                <RadioGroup
                  value={orientation}
                  onValueChange={(v) => setOrientation(v as "landscape" | "portrait")}
                  className="gap-1"
                >
                  {(["landscape", "portrait"] as const).map((o) => (
                    <label
                      key={o}
                      className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm capitalize"
                    >
                      <RadioGroupItem value={o} /> {o}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
            <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 text-sm">
              <Checkbox
                checked={splitByGroup}
                onCheckedChange={(v) => setSplitByGroup(v === true)}
              />
              Split wide tables into multiple page-sets by group (recommended)
            </label>
          </Option>

          {/* ---- Recently updated (Part C ⑦, optional, default OFF) ---- */}
          {hasRecentUpdates && recentLegend && (
            <Option
              id="mark-recent"
              title="Mark recently updated cells"
              hint={`${recentLegend} — a light fill in Excel/PDF plus a legend line in the report header. No extra column.`}
            >
              <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={markRecent} onCheckedChange={(v) => setMarkRecent(v === true)} />
                Mark recently updated cells in this export
              </label>
            </Option>
          )}

          {/* ---- Extra sheets (Excel) ---- */}
          <Option id="extras" title="Extra Excel sheets" hint="Optional, built from the same rows">
            <div className="grid gap-1.5 sm:grid-cols-3">
              {([
                ["surveillanceDue", "Surveillance Due"],
                ["fireNocAlerts", "Fire NOC Alerts"],
                ["gapClosure", "Gap Closure"],
              ] as [keyof typeof extras, string][]).map(([key, label]) => (
                <label
                  key={key}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm"
                >
                  <Checkbox
                    checked={extras[key]}
                    onCheckedChange={(v) => setExtras((e) => ({ ...e, [key]: v === true }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </Option>

          {/* ---- Live preview of the first page-set ---- */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Preview — first page-set
            </p>
            <div className="mt-2 overflow-x-auto rounded-lg border border-border/60 bg-background p-2">
              <p className="mb-1 text-[11px] font-bold text-primary">
                NQAS Tracker – Facility Master List
              </p>
              <p className="mb-1 text-[10px] text-muted-foreground">
                {preview?.title ?? "—"} · {preview?.columns.length ?? 0} columns
              </p>
              <table className="text-[10px]">
                <thead>
                  <tr>
                    {preview?.columns.slice(0, 8).map((c) => (
                      <th
                        key={c.key}
                        className="border border-border/60 bg-primary/90 px-1 py-0.5 text-left font-semibold text-white"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {preview?.columns.slice(0, 8).map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "border border-border/60 px-1 py-0.5",
                          c.align === "right" && "text-right",
                          c.align === "center" && "text-center",
                        )}
                      >
                        {c.type === "status" ? "[pill]" : c.type === "score" ? "78.5%" : "—"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Separator />
        <DialogFooter className="gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {scopeCount} rows · {exportable.length} columns
          </span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-10" onClick={() => run("print")}>
              <Printer className="mr-1.5 size-4" /> Print
            </Button>
            <Button variant="outline" className="h-10" onClick={() => run("csv")}>
              <FileDown className="mr-1.5 size-4" /> CSV
            </Button>
            <Button variant="outline" className="h-10" onClick={() => run("pdf")}>
              <FileType2 className="mr-1.5 size-4" /> PDF
            </Button>
            <Button className="h-10" onClick={() => run("xlsx")}>
              <Check className="mr-1.5 size-4" />
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
