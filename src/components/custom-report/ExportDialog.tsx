import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, File as FileCsv, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  buildExportTable,
  buildCsv,
  downloadPivotCsv,
  buildRawFacilityGrid,
  exportPivotPdf,
  exportPivotExcel,
  exportStamp,
  type ColumnRole,
} from "@/lib/pivotExport";
import type { PivotResult, PivotRow } from "@/lib/pivot";

export type ExportFormat = "pdf" | "xlsx" | "csv";

export interface ExportOptions {
  format: ExportFormat;
  title: string;
  subtitle: string;
  district: string;
  generatedBy: string;
  orientation: "auto" | "portrait" | "landscape";
  pageSize: "a4" | "a3" | "legal";
  marginsMm: number;
  includeSubtotals: boolean;
  includeGrandTotal: boolean;
  includeFiltersSummary: boolean;
  includeChart: boolean;
  showPageNumbers: boolean;
}

const FORMAT_META: Record<ExportFormat, { icon: typeof FileText; label: string; hint: string }> = {
  pdf: { icon: FileText, label: "PDF", hint: "Print-ready, vector text, repeats headers" },
  xlsx: { icon: FileSpreadsheet, label: "Excel (.xlsx)", hint: "3 sheets, formulas, freeze panes" },
  csv: { icon: FileCsv, label: "CSV", hint: "UTF-8 with BOM for Excel" },
};

export function ExportDialog({
  open,
  onOpenChange,
  result,
  rawRows,
  filtersList,
  chart,
  defaultTitle,
  defaultSubtitle,
  defaultDistrict,
  defaultGeneratedBy,
  initialFormat,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  result: PivotResult;
  rawRows: PivotRow[];
  /** Human text of every applied filter, e.g. "Block: Bargur". */
  filtersList: string[];
  /** Top-row chart data (vector-rendered inside the PDF). */
  chart: { labels: string[]; values: number[]; title: string } | null;
  defaultTitle: string;
  defaultSubtitle: string;
  defaultDistrict: string;
  defaultGeneratedBy: string;
  initialFormat?: ExportFormat;
}) {
  const [o, setO] = useState<ExportOptions>({
    format: "pdf",
    title: defaultTitle,
    subtitle: defaultSubtitle,
    district: defaultDistrict,
    generatedBy: defaultGeneratedBy,
    orientation: "auto",
    pageSize: "a4",
    marginsMm: 14,
    includeSubtotals: true,
    includeGrandTotal: true,
    includeFiltersSummary: true,
    includeChart: false,
    showPageNumbers: true,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !initialFormat) return;
    setO((prev) => ({ ...prev, format: initialFormat }));
  }, [open, initialFormat]);

  const table = useMemo(
    () =>
      buildExportTable(
        result,
        {
          title: o.title || defaultTitle,
          subtitle: o.subtitle || defaultSubtitle,
          district: o.district,
          generatedBy: o.generatedBy,
          filters: filtersList,
        },
        { includeSubtotals: o.includeSubtotals, includeGrandTotal: o.includeGrandTotal },
      ),
    [result, o, filtersList, defaultTitle, defaultSubtitle],
  );

  const previewCols = table.columns.slice(0, 8);
  const previewRows = table.rows.slice(0, 7);

  const run = async () => {
    setBusy(true);
    try {
      const stamp = exportStamp();
      const safeTitle = (o.title || defaultTitle)
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 40);
      if (o.format === "pdf") {
        exportPivotPdf(`${safeTitle}-${stamp}.pdf`, table, {
          orientation: o.orientation,
          pageSize: o.pageSize,
          marginsMm: o.marginsMm,
          showPageNumbers: o.showPageNumbers,
          includeFiltersSummary: o.includeFiltersSummary,
          chart: o.includeChart && chart ? chart : null,
        });
      } else if (o.format === "xlsx") {
        await exportPivotExcel(
          `${safeTitle}-${stamp}.xlsx`,
          table,
          buildRawFacilityGrid(rawRows),
          { pageSize: o.pageSize, orientation: o.orientation === "portrait" ? "portrait" : "landscape" },
        );
      } else {
        downloadPivotCsv(
          `${safeTitle}-${stamp}.csv`,
          buildCsv(
            table.columns.map((c) => c.header),
            table.rows.map((r) => r.cells),
          ),
        );
      }
      onOpenChange(false);
      toast.success(`${FORMAT_META[o.format].label} downloaded`);
    } catch (err) {
      console.error(err);
      toast.error("Export failed — try a smaller report or another format.");
    } finally {
      setBusy(false);
    }
  };

  const set = (patch: Partial<ExportOptions>) => setO((prev) => ({ ...prev, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export settings</DialogTitle>
          <DialogDescription>
            Everything below is written into the file — check the live preview,
            then download.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          {/* ---------------- settings ---------------- */}
          <div className="space-y-3.5">
            <div>
              <Label className="mb-1 block text-xs font-semibold">Format</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(FORMAT_META) as ExportFormat[]).map((fmt) => {
                  const meta = FORMAT_META[fmt];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      data-tip={meta.hint}
                      aria-pressed={o.format === fmt}
                      onClick={() => set({ format: fmt })}
                      className={cn(
                        "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-semibold transition-colors",
                        o.format === fmt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 hover:bg-accent",
                      )}
                    >
                      <Icon className="size-4" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Report title">
              <Input
                value={o.title}
                onChange={(e) => set({ title: e.target.value })}
                className="h-9 text-sm"
                placeholder={defaultTitle}
              />
            </Field>
            <Field label="Subtitle">
              <Input
                value={o.subtitle}
                onChange={(e) => set({ subtitle: e.target.value })}
                className="h-9 text-sm"
                placeholder={defaultSubtitle}
              />
            </Field>
            <Field label="District / State">
              <Input
                value={o.district}
                onChange={(e) => set({ district: e.target.value })}
                className="h-9 text-sm"
              />
            </Field>
            <Field label="Generated by">
              <Input
                value={o.generatedBy}
                onChange={(e) => set({ generatedBy: e.target.value })}
                className="h-9 text-sm"
              />
            </Field>

            <div className="grid grid-cols-3 gap-2">
              <Field label="Orientation">
                <Select value={o.orientation} onValueChange={(v) => set({ orientation: v as ExportOptions["orientation"] })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Page size">
                <Select value={o.pageSize} onValueChange={(v) => set({ pageSize: v as ExportOptions["pageSize"] })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4</SelectItem>
                    <SelectItem value="a3">A3</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Margin">
                <Select value={String(o.marginsMm)} onValueChange={(v) => set({ marginsMm: Number(v) })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">Narrow (6mm)</SelectItem>
                    <SelectItem value="10">Normal (10mm)</SelectItem>
                    <SelectItem value="14">Wide (14mm)</SelectItem>
                    <SelectItem value="20">Wide+ (20mm)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Include</p>
              <SwitchRow
                checked={o.includeSubtotals}
                onChange={(v) => set({ includeSubtotals: v })}
                label="Subtotal rows"
              />
              <SwitchRow
                checked={o.includeGrandTotal}
                onChange={(v) => set({ includeGrandTotal: v })}
                label="Grand total row"
              />
              {o.format === "pdf" && (
                <SwitchRow
                  checked={o.includeFiltersSummary}
                  onChange={(v) => set({ includeFiltersSummary: v })}
                  label="Filters summary in header"
                />
              )}
              {o.format === "pdf" && (
                <SwitchRow
                  checked={o.includeChart}
                  onChange={(v) => set({ includeChart: v })}
                  label="Quick chart (top rows)"
                />
              )}
              {o.format === "pdf" && (
                <SwitchRow
                  checked={o.showPageNumbers}
                  onChange={(v) => set({ showPageNumbers: v })}
                  label="Page numbers in footer"
                />
              )}
            </div>
          </div>

          {/* ---------------- live preview ---------------- */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Live preview
            </p>
            <div className="rounded-xl border border-border/60 bg-white p-4 text-slate-900 shadow-inner dark:bg-slate-950 dark:text-slate-200">
              <p className="text-[15px] font-bold text-teal-800 dark:text-teal-400">
                {o.title || defaultTitle}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                {o.subtitle || defaultSubtitle}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {o.district} · Generated {new Date().toLocaleString()} · By {o.generatedBy || "—"}
              </p>
              {o.includeFiltersSummary && filtersList.length > 0 && (
                <p className="mt-1.5 rounded bg-teal-50 px-2 py-1 text-[10.5px] text-teal-900 dark:bg-teal-500/10 dark:text-teal-200">
                  Filters: {filtersList.join(" · ")}
                </p>
              )}
              <div className="mt-2 overflow-hidden rounded border border-slate-300 dark:border-slate-700">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      {previewCols.map((c) => (
                        <th
                          key={c.header}
                          className="bg-teal-700 px-1.5 py-1 text-left font-semibold text-white"
                        >
                          {c.header}
                        </th>
                      ))}
                      {table.columns.length > 8 && (
                        <th className="bg-teal-700 px-1.5 py-1 text-left font-semibold text-white">
                          …{table.columns.length - 8} more
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr
                        key={i}
                        className={cn(
                          row.kind !== "leaf" && "font-bold",
                          row.kind !== "leaf" && "bg-teal-50 dark:bg-teal-500/15",
                          row.kind === "leaf" && i % 2 === 1 && "bg-slate-50 dark:bg-slate-900",
                        )}
                      >
                        {previewCols.map((c, j) => (
                          <td
                            key={j}
                            className={cn(
                              "border-t border-slate-200 px-1.5 py-1",
                              c.role === ("number" as ColumnRole) && "text-right tabular-nums",
                              row.kind !== "leaf" && "font-semibold",
                            )}
                          >
                            {row.cells[j] == null ? "" : String(row.cells[j])}
                          </td>
                        ))}
                        {table.columns.length > 8 && <td className="border-t border-slate-200 px-1.5 py-1">…</td>}
                      </tr>
                    ))}
                    {table.rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={previewCols.length + (table.columns.length > 8 ? 1 : 0)}
                          className="border-t border-slate-200 py-3 text-center italic text-slate-500"
                        >
                          No rows in the current report.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-500 dark:text-slate-500">
                {o.showPageNumbers ? "Page 1" : ""} · NQAS Tracker ·{" "}
                {table.rows.length} rows ·{" "}
                {o.pageSize.toUpperCase()}{" "}
                {o.orientation === "auto"
                  ? table.columns.length > 6
                    ? "landscape"
                    : "portrait"
                  : o.orientation}{" "}
                {o.marginsMm}mm margins
              </p>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {result.filteredCount} of {result.totalCount} facilities ·{" "}
              {table.rows.length} export rows · {table.columns.length} columns.
              {o.format === "pdf" &&
                (table.columns.length > 6 || o.orientation === "landscape") &&
                " Landscape is selected automatically for wide tables."}
              {chart && o.format === "pdf" && o.includeChart &&
                ` Chart: ${chart.labels.length} top groups.`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void run()} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Download {FORMAT_META[o.format].label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function SwitchRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
