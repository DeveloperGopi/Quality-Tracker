import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  ChevronDown,
  Clock3,
  FileSpreadsheet,
  History,
  Loader2,
  Merge,
  MousePointerClick,
  Upload,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  cellText,
  mergeLinkImportRows,
  parseLinksHtml,
  parseLinksMatrix,
  rowsReadyToApply,
  summarizeLinksImport,
  type LinkImportRow,
  type LinksMatrix,
} from "@/lib/linksImport";
import { parseLinksPaste } from "@/lib/linksParseClient";
import {
  detectLinkType,
  frequencyLabel,
  normalizeLinkUrl,
  suggestLinkLabel,
  validateLinkUrl,
  type LinksConfig,
} from "@/lib/links";
import { formatLinkDate } from "@/lib/links";
import { cn } from "@/lib/utils";

export type LinksImportTarget = {
  id: string;
  serial: number;
  title: string;
  categoryName: string;
  ownerName: string | null;
  level: string | null;
  frequency: string;
  lastUpdated: string | null;
  status: string;
  remarks: string | null;
  urls: { url: string; kind: string }[];
};

export function LinksImportDialog({
  open,
  onOpenChange,
  initialText,
  initialFile,
  fileName: initialFileName,
  categories,
  owners,
  statuses,
  frequencies,
  existing,
  config,
  today,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialText?: string | null;
  initialFile?: File | null;
  fileName?: string | null;
  categories: string[];
  owners: string[];
  statuses: LinksConfig["statuses"];
  frequencies: LinksConfig["frequencies"];
  existing: LinksImportTarget[];
  config: LinksConfig;
  today: string;
  onImported?: () => void;
}) {
  const [text, setText] = useState(initialText ?? "");
  const [html, setHtml] = useState("");
  const [fileName, setFileName] = useState(initialFileName ?? "");
  const [matrix, setMatrix] = useState<LinksMatrix | null>(null);
  const [rows, setRows] = useState<LinkImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [mode, setMode] = useState<"add" | "update">("add");
  const [mergeGroups, setMergeGroups] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"input" | "review">("review");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const openedRef = useRef(false);
  const applyImport = useMutation(api.links.applyImport);
  const undoImport = useMutation(api.links.undoImport);
  const imports = useQuery(api.links.listImports, { limit: 8 });

  const build = (source: LinksMatrix, name: string, modeOverride?: "add" | "update") => {
    const parsed = parseLinksMatrix(source, {
      categories,
      owners,
      statuses,
      frequencies,
      existing: existing.map((e) => ({ ...e, ownerName: e.ownerName ?? "", level: e.level ?? "", lastUpdated: e.lastUpdated ?? "", remarks: e.remarks ?? "" })),
      today,
      updateMode: (modeOverride ?? mode) === "update",
      defaultVisibility: config.defaultVisibility,
    });
    setMatrix(source);
    setHeaders(parsed.headers);
    setMapping(parsed.mapping as unknown as Record<string, number | null>);
    setRows(parsed.rows);
    setFileName(name);
    setStep("review");
  };

  const parse = async (sourceText: string, sourceHtml = "", name = fileName || "Pasted links") => {
    if (!sourceText.trim() && !sourceHtml.trim()) {
      toast.error("Paste some rows or choose a file first");
      return;
    }
    // HTML paste keeps its anchors on the main thread (DOMParser); plain
    // clipboard text goes through the Links Web Worker first.
    const source = sourceHtml ? parseLinksHtml(sourceHtml) : await parseLinksPaste(sourceText);
    if (!source.length) {
      toast.error("No rows found. Copy the sheet with its header row and try again.");
      return;
    }
    build(source, name);
  };

  const loadFile = async (file: File) => {
    setBusy(true);
    try {
      const name = file.name;
      if (/\.(xlsx|xls)$/i.test(name) && typeof window !== "undefined") {
        try {
          const ExcelJS = (await import("exceljs")).default;
          const wb = new ExcelJS.Workbook();
          await wb.xlsx.load(await file.arrayBuffer());
          const ws = wb.worksheets[0];
          const data: LinksMatrix = [];
          ws.eachRow({ includeEmpty: true }, (row) => {
            const cells: LinksMatrix[number] = [];
            for (let c = 1; c <= Math.max(row.cellCount, ws.columnCount); c += 1) {
              const cell = row.getCell(c);
              const raw = cell.text ?? "";
              const link = (cell as unknown as { hyperlink?: string }).hyperlink;
              cells.push(link ? { text: raw, url: link } : raw);
            }
            data.push(cells);
          });
          if (!data.length) throw new Error("The workbook has no rows");
          build(data, name);
          return;
        } catch (err) {
          toast.message("ExcelJS could not read this file — using the spreadsheet reader", {
            description: err instanceof Error ? err.message : undefined,
          });
        }
      }
      if (/\.(csv|tsv|txt)$/i.test(name)) {
        const raw = await file.text();
        setText(raw);
        parse(raw, "", name);
        return;
      }
      // Fallback for .xls and older workbooks. The workbook reader keeps the
      // cached labels; the hyperlink table is preserved when ExcelJS works.
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        raw: true,
        defval: "",
        blankrows: false,
      });
      build(data as LinksMatrix, name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setBusy(false);
    }
  };

  const refreshRows = (nextMode: "add" | "update") => {
    setMode(nextMode);
    if (matrix) build(matrix, fileName || "Pasted links", nextMode);
  };

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;
    if (initialFile) {
      void loadFile(initialFile);
    } else if (initialText?.trim()) {
      setText(initialText);
      parse(initialText, "", initialFileName || "Pasted links");
    }
    // Parse only when the dialog opens with new input, never on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFile, initialText]);

  const setDecision = (rowNo: number, field: "category" | "owner" | "frequency" | "status", value: string) => {
    setRows((current) =>
      current.map((row) => {
        if (row.rowNo !== rowNo) return row;
        const decisions = { ...row.decisions };
        if (value === "__create__") delete decisions[field];
        else if (field === "category") row = { ...row, categoryName: value };
        else if (field === "owner") row = { ...row, ownerName: value };
        else if (field === "frequency") row = { ...row, frequency: value };
        else if (field === "status") row = { ...row, status: value };
        if (value !== "__create__") delete decisions[field];
        return {
          ...row,
          decisions,
          state: row.linkMissing || row.issues.some((i) => /future|Could not read|not an http/i.test(i))
            ? row.state
            : row.existingId
              ? "will-change"
              : "new",
        };
      }),
    );
  };

  const acceptSuggestions = () => {
    setRows((current) =>
      current.map((row) => {
        const decisions = { ...row.decisions };
        let next = { ...row };
        for (const field of ["category", "owner"] as const) {
          const choice = decisions[field];
          if (!choice || choice === "__create__") continue;
          if (field === "category") next = { ...next, categoryName: choice };
          else next = { ...next, ownerName: choice };
          delete decisions[field];
        }
        return {
          ...next,
          decisions,
          state: Object.keys(decisions).length > 0 || next.linkMissing
            ? next.state
            : next.existingId
              ? "will-change"
              : "new",
        };
      }),
    );
  };

  const fixMissing = (rowNo: number, url: string) => {
    const check = validateLinkUrl(url);
    if (!check.ok) return;
    const normalized = check.url;
    setRows((current) =>
      current.map((row) => {
        if (row.rowNo !== rowNo) return row;
        const links = [
          ...row.links.filter((l) => l.kind !== "link"),
          {
            label: row.links.find((l) => l.label)?.label || suggestLinkLabel(normalized),
            url: normalized,
            type: detectLinkType(normalized),
            kind: "link" as const,
            isPrimary: !row.links.some((l) => l.kind === "link" && l.isPrimary),
          },
        ];
        const primary = links.find((l) => l.kind === "link") ?? links[0];
        for (const link of links) link.isPrimary = link === primary;
        return {
          ...row,
          links,
          linkMissing: false,
          issues: row.issues.filter((i) => !/has no URL/.test(i)),
          state: row.existingId ? "will-change" : "new",
        };
      }),
    );
  };

  const effectiveRows = useMemo(() => {
    const out: LinkImportRow[] = [];
    const groups = new Map<string, LinkImportRow[]>();
    for (const row of rows) {
      if (!row.mergeGroup) {
        out.push(row);
        continue;
      }
      const list = groups.get(row.mergeGroup) ?? [];
      list.push(row);
      groups.set(row.mergeGroup, list);
    }
    for (const [group, list] of groups) {
      if (mergeGroups.has(group) && list.length > 1) out.push(mergeLinkImportRows(list));
      else out.push(...list);
    }
    return out.sort((a, b) => a.rowNo - b.rowNo);
  }, [rows, mergeGroups]);

  const summary = useMemo(() => summarizeLinksImport(effectiveRows), [effectiveRows]);
  const ready = useMemo(() => rowsReadyToApply(effectiveRows), [effectiveRows]);
  const groups = useMemo(() => {
    const map = new Map<string, LinkImportRow[]>();
    for (const row of rows) {
      if (!row.mergeGroup) continue;
      const list = map.get(row.mergeGroup) ?? [];
      list.push(row);
      map.set(row.mergeGroup, list);
    }
    return [...map.entries()].filter(([, list]) => list.length > 1);
  }, [rows]);

  const apply = async () => {
    if (busy) return;
    if (ready.length === 0) {
      toast.error("No rows are ready to apply. Fix the highlighted values first.");
      return;
    }
    setBusy(true);
    try {
      const result = await applyImport({
        fileName: fileName || "Links paste",
        mode,
        rows: ready.map((row) => ({
          rowNo: row.rowNo,
          serial: row.serial,
          title: row.title,
          categoryName: row.categoryName,
          ownerName: row.ownerName || undefined,
          level: row.level || undefined,
          frequency: row.frequency,
          customDays: row.customDays,
          lastUpdated: row.lastUpdated || undefined,
          status: row.status,
          remarks: row.remarks || undefined,
          visibility: row.visibility,
          existingId: row.existingId,
          links: row.links.map((u) => ({
            label: u.label,
            url: u.url,
            type: u.type,
            kind: u.kind,
            isPrimary: u.isPrimary,
          })),
        })),
      });
      const skipped = effectiveRows.length - ready.length;
      toast.success(
        `${result.imported} link${result.imported === 1 ? "" : "s"} ${mode === "update" ? "updated" : "added"}`,
        {
          description: [
            result.noChange ? `${result.noChange} unchanged` : "",
            skipped ? `${skipped} need a decision and were skipped` : "",
            "Every change is in the audit log.",
          ].filter(Boolean).join(" · "),
          duration: 30_000,
          action: {
            label: "Undo",
            onClick: () => {
              void undoImport({ batchId: result.batchId as Id<"importBatches"> })
                .then(() => {
                  toast.success("Import undone");
                  onImported?.();
                })
                .catch((err) => toast.error(err instanceof Error ? err.message : "Could not undo"));
            },
          },
        },
      );
      onImported?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply the import");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 pr-12 sm:px-6">
          <DialogTitle className="text-lg">Import links</DialogTitle>
          <DialogDescription>
            Paste from Excel or upload the sheet. Nothing is saved until you review and press Apply.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5">
          {step === "input" || !matrix ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1.5 size-3.5" /> Upload .xlsx / .xls / .csv / .tsv
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void loadFile(file);
                  }}
                />
                <span className="text-[11px] text-muted-foreground">or paste below — hyperlinks are kept when the clipboard provides them.</span>
              </div>
              <div
                className={cn(
                  "rounded-xl border-2 border-dashed p-3 transition-colors",
                  drag ? "border-primary bg-primary/5" : "border-border/70",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void loadFile(file);
                }}
              >
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onPaste={(e) => {
                    const pastedHtml = e.clipboardData.getData("text/html");
                    if (pastedHtml) setHtml(pastedHtml);
                    const pasted = e.clipboardData.getData("text/plain");
                    if (pasted) {
                      setText(pasted);
                      // Let the default paste happen, then parse the current text.
                      window.setTimeout(() => parse(pasted, pastedHtml, "Pasted links"), 0);
                    }
                  }}
                  rows={8}
                  placeholder={"Category\tReport Name\tFrequency\tLast Updated\tLink\tForm Link\tOwner\tStatus\tRemarks\nBasic Data\tSaQsham\t-\t22-Jun-2026\thttps://saqsham.nhsrcindia.org\t\tNHSRC\tActive\t"}
                  className="min-h-40 resize-y border-0 bg-transparent font-mono text-xs shadow-none focus-visible:ring-0"
                  aria-label="Paste links rows"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => parse(text, html)}>
                  <MousePointerClick className="mr-1.5 size-3.5" /> Review pasted rows
                </Button>
                <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  Match existing by
                  <select value={mode} onChange={(e) => refreshRows(e.target.value as "add" | "update")} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                    <option value="add">Add new (safe default)</option>
                    <option value="update">Update existing — by S. No, else title + category</option>
                  </select>
                </label>
              </div>

              {imports && imports.length > 0 && (
                <section className="rounded-xl border border-border/60 p-2">
                  <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><History className="size-3.5" /> Import history</h3>
                  <ul className="divide-y divide-border/40">
                    {imports.map((batch) => (
                      <li key={batch.id} className="flex flex-wrap items-center gap-2 py-1.5 text-xs">
                        <FileSpreadsheet className="size-3.5 text-muted-foreground" />
                        <span className="font-medium">{batch.fileName}</span>
                        <span className="text-muted-foreground">{formatLinkDate(new Date(batch.importedAt).toISOString().slice(0, 10))}</span>
                        <span className="text-muted-foreground">{batch.rowsUpdated} updated · {batch.rowsNoChange} unchanged</span>
                        {batch.status === "undone" ? (
                          <span className="rounded-full bg-muted px-1.5 text-[10px]">Undone</span>
                        ) : (
                          <button
                            type="button"
                            className="ml-auto inline-flex items-center gap-1 text-primary"
                            onClick={async () => {
                              try {
                                await undoImport({ batchId: batch.id as Id<"importBatches"> });
                                toast.success("Import undone");
                                onImported?.();
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Could not undo");
                              }
                            }}
                          >
                            <Undo2 className="size-3" /> Undo
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setStep("input")}>
                  <ChevronDown className="mr-1 size-3.5 rotate-90" /> Change paste
                </Button>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Match
                  <select value={mode} onChange={(e) => refreshRows(e.target.value as "add" | "update")} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                    <option value="add">Add new</option>
                    <option value="update">Update existing</option>
                  </select>
                </label>
                <span className="text-xs text-muted-foreground">{fileName}</span>
                {rows.some((row) => row.decisions.category && row.decisions.category !== "__create__" || row.decisions.owner && row.decisions.owner !== "__create__") && (
                  <Button size="sm" variant="outline" className="ml-auto h-8" onClick={acceptSuggestions}>
                    Accept all spelling suggestions
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <SummaryChip label="New" value={summary.new} tone="teal" />
                <SummaryChip label="Will change" value={summary.willChange} tone="blue" />
                <SummaryChip label="No change" value={summary.noChange} tone="slate" />
                <SummaryChip label="Needs your decision" value={summary.needsDecision} tone="amber" />
                <SummaryChip label="Link missing" value={summary.linkMissing} tone="rose" />
                <SummaryChip label="Skipped" value={summary.skipped} tone="slate" />
              </div>

              <MappingStrip headers={headers} mapping={mapping} />

              {groups.length > 0 && (
                <section className="rounded-lg border border-amber-300/70 bg-amber-50/70 p-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-950">
                    <Merge className="size-3.5" /> Same report name and category
                  </p>
                  {groups.map(([group, list]) => (
                    <label key={group} className="mt-1 flex cursor-pointer items-start gap-2 text-[11px] text-amber-950">
                      <input
                        type="checkbox"
                        checked={mergeGroups.has(group)}
                        onChange={() =>
                          setMergeGroups((current) => {
                            const next = new Set(current);
                            if (next.has(group)) next.delete(group);
                            else next.add(group);
                            return next;
                          })
                        }
                      />
                      <span>
                        Merge {list.length} rows into one report with {list.reduce((n, r) => n + r.links.length, 0)} links{" "}
                        <span className="text-amber-800/80">({list.map((r) => r.title).join(" · ")})</span>
                      </span>
                    </label>
                  ))}
                </section>
              )}

              <div className="overflow-auto rounded-xl border border-border/60" style={{ maxHeight: "52vh" }}>
                <table className="w-full min-w-[980px] border-collapse text-xs" data-testid="links-import-review">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                    <tr className="border-b text-left">
                      <th className="w-12 px-2 py-2 font-semibold">Row</th>
                      <th className="w-24 px-2 py-2 font-semibold">State</th>
                      <th className="sticky left-0 z-20 min-w-56 bg-muted/95 px-2 py-2 font-semibold">Report Name</th>
                      <th className="min-w-32 px-2 py-2 font-semibold">Category</th>
                      <th className="min-w-32 px-2 py-2 font-semibold">Frequency</th>
                      <th className="min-w-28 px-2 py-2 font-semibold">Last updated</th>
                      <th className="min-w-64 px-2 py-2 font-semibold">Link</th>
                      <th className="min-w-28 px-2 py-2 font-semibold">Owner</th>
                      <th className="w-28 px-2 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveRows.map((row) => (
                      <tr key={`${row.rowNo}-${row.state}`} className="border-b border-border/40 align-top odd:bg-background even:bg-muted/15">
                        <td className="px-2 py-2 tabular-nums text-muted-foreground">{row.rowNo}</td>
                        <td className="px-2 py-2"><StateBadge state={row.state} /></td>
                        <td className="sticky left-0 z-[5] min-w-56 bg-inherit px-2 py-2">
                          <span className="font-semibold">{row.title || "-"}</span>
                          {row.remarks && <span className="mt-0.5 block text-[10px] text-muted-foreground">{row.remarks}</span>}
                          {row.issues.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {row.issues.filter((i) => !i.includes("merge into one report")).slice(0, 2).map((issue) => (
                                <li key={issue} className="flex items-start gap-1 text-[10px] text-amber-800">
                                  <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {issue}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <span className="block">{row.categoryName}</span>
                          {row.decisions.category && (
                            <DecisionSelect
                              label={`Category for row ${row.rowNo}`}
                              value={row.decisions.category}
                              options={categories}
                              suggestion={row.decisions.category}
                              onCreate={() => setDecision(row.rowNo, "category", "__create__")}
                              onChange={(v) => setDecision(row.rowNo, "category", v)}
                            />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <span className="block">{frequencyLabel(config, row.frequency)}</span>
                          {row.decisions.frequency && (
                            <DecisionSelect
                              label={`Frequency for row ${row.rowNo}`}
                              value={row.decisions.frequency}
                              options={frequencies.map((f) => f.value)}
                              labels={Object.fromEntries(frequencies.map((f) => [f.value, f.label]))}
                              suggestion={row.decisions.frequency}
                              onChange={(v) => setDecision(row.rowNo, "frequency", v)}
                            />
                          )}
                        </td>
                        <td className="px-2 py-2 tabular-nums">
                          {row.lastUpdated ? formatLinkDate(row.lastUpdated) : "-"}
                          {row.issues.some((i) => /future|Could not read/.test(i)) && <span className="block text-[10px] text-destructive">Check date</span>}
                        </td>
                        <td className="px-2 py-2">
                          {row.links.filter((l) => l.kind === "link").map((l) => (
                            <span key={l.url} className="block max-w-72 truncate text-sky-800" data-tip={l.url}>{l.label || l.url}</span>
                          ))}
                          {row.links.filter((l) => l.kind === "form").map((l) => (
                            <span key={l.url} className="mt-0.5 block max-w-72 truncate text-violet-800" data-tip={l.url}>Form · {l.label || l.url}</span>
                          ))}
                          {row.linkMissing && (
                            <div className="mt-1">
                              <Input
                                aria-label={`Paste missing link for ${row.title}`}
                                placeholder="Paste the missing URL"
                                className="h-8 text-[11px]"
                                onBlur={(e) => fixMissing(row.rowNo, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") fixMissing(row.rowNo, e.currentTarget.value);
                                }}
                              />
                            </div>
                          )}
                          {row.duplicateUrl && <span className="mt-0.5 block text-[10px] text-amber-800">Same URL already exists</span>}
                        </td>
                        <td className="px-2 py-2">
                          <span>{row.ownerName || "-"}</span>
                          {row.level && <span className="block text-[10px] text-muted-foreground">Level: {row.level}</span>}
                          {row.decisions.owner && (
                            <DecisionSelect
                              label={`Owner for row ${row.rowNo}`}
                              value={row.decisions.owner}
                              options={owners}
                              suggestion={row.decisions.owner}
                              onCreate={() => setDecision(row.rowNo, "owner", "__create__")}
                              onChange={(v) => setDecision(row.rowNo, "owner", v)}
                            />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <span>{row.status}</span>
                          {row.decisions.status && (
                            <DecisionSelect
                              label={`Status for row ${row.rowNo}`}
                              value={row.decisions.status}
                              options={statuses.map((s) => s.name)}
                              suggestion={row.decisions.status}
                              onChange={(v) => setDecision(row.rowNo, "status", v)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {step === "review" && matrix && (
          <div className="shrink-0 border-t border-border/60 bg-background/95 px-4 py-2 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                <b className="font-semibold text-foreground">{ready.length}</b> of {effectiveRows.length} rows ready
                {summary.needsDecision + summary.linkMissing > 0 && (
                  <span className="ml-1 text-amber-800">
                    · {summary.needsDecision + summary.linkMissing} need a decision and will be skipped
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                <Button onClick={() => void apply()} disabled={busy || ready.length === 0}>
                  {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Check className="mr-1.5 size-3.5" />}
                  Apply {ready.length} row{ready.length === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: "teal" | "blue" | "amber" | "rose" | "slate" }) {
  const classes = {
    teal: "border-teal-300/70 bg-teal-50 text-teal-900",
    blue: "border-sky-300/70 bg-sky-50 text-sky-900",
    amber: "border-amber-300/80 bg-amber-50 text-amber-900",
    rose: "border-rose-300/80 bg-rose-50 text-rose-900",
    slate: "border-border bg-muted/40 text-muted-foreground",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", classes)}>{label} <b className="tabular-nums">{value}</b></span>;
}

function StateBadge({ state }: { state: LinkImportRow["state"] }) {
  const map = {
    new: ["New", "border-teal-300/70 bg-teal-50 text-teal-900"],
    "will-change": ["Will change", "border-sky-300/70 bg-sky-50 text-sky-900"],
    "no-change": ["No change", "border-border bg-muted/50 text-muted-foreground"],
    "needs-decision": ["Needs your decision", "border-amber-300/80 bg-amber-50 text-amber-900"],
    "link-missing": ["Link missing", "border-rose-300/80 bg-rose-50 text-rose-900"],
    skipped: ["Skipped", "border-border bg-muted/50 text-muted-foreground"],
  }[state];
  return <span className={cn("inline-flex whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", map[1])}>{map[0]}</span>;
}

function DecisionSelect({
  label,
  value,
  options,
  labels,
  suggestion,
  onCreate,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  suggestion?: string;
  onCreate?: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <select aria-label={label} value="" onChange={(e) => onChange(e.target.value)} className="h-7 max-w-40 rounded border border-amber-300 bg-background px-1 text-[10px]">
        <option value="">Choose…</option>
        {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
        {onCreate && <option value="__create__">Create “{suggestion}”</option>}
      </select>
      {suggestion && suggestion !== "__create__" && (
        <button type="button" onClick={() => onChange(suggestion)} className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
          Use {suggestion}
        </button>
      )}
    </div>
  );
}

function MappingStrip({ headers, mapping }: { headers: string[]; mapping: Record<string, number | null> }) {
  const labels: Record<string, string> = {
    serial: "S. No",
    category: "Category",
    title: "Report Name",
    frequency: "Frequency",
    lastUpdated: "Last Updated",
    link: "Link",
    more: "More links",
    form: "Form Link",
    owner: "Owner",
    status: "Status",
    remarks: "Remarks",
  };
  const used = Object.entries(mapping).filter(([, idx]) => idx != null);
  if (!headers.length) return null;
  return (
    <details className="rounded-lg border border-border/60 bg-background/60 px-2 py-1.5">
      <summary className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <ArrowLeftRight className="size-3" /> Header matching · {used.length} columns found
      </summary>
      <div className="mt-1 flex flex-wrap gap-1">
        {used.map(([key, idx]) => (
          <span key={key} className="rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px]">
            <span className="text-muted-foreground">{headers[idx!] || "?"}</span> → <b>{labels[key] ?? key}</b>
          </span>
        ))}
      </div>
    </details>
  );
}
