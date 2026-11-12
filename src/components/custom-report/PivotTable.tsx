import { useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  AGG_LABELS,
  formatCell,
  measureLabel,
  type CellValue,
  type DecimalOption,
  type PivotFieldDef,
  type PivotOutRow,
  type PivotResult,
  type PivotValueSpec,
} from "@/lib/pivot";
import {
  StickyTableScroll,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
/** THE shared column model — the Excel/PDF/CSV writers read the same one. */
import {
  buildPivotColumns,
  pivotCounter,
  type PivotColumnModel,
} from "@/lib/pivotColumns";
import { cn } from "@/lib/utils";

/** Back-compat re-exports: the column model moved to lib/pivotColumns so
 *  the export writers can read it without React module coupling, but the
 *  page and the contract tests import it from here. */
export { buildPivotColumns, pivotCounter };
export type { PivotColumnModel };

export type Layout = "compact" | "outline" | "tabular";
export type FormatMode = "off" | "heatmap" | "databars" | "chips";
/** Show value labels: Auto = a second header level only with 2+ values. */
export type ValueLabelsMode = "auto" | "always" | "never";

export interface ReportStyle {
  subtotals: boolean;
  grandTotals: boolean;
  grandTotalColumn: boolean;
  striped: boolean;
  borders: boolean;
  highlightTotals: boolean;
}

export interface DrillTarget {
  row: PivotOutRow;
  /** Non-null when a specific column combo was clicked. */
  comboIndex: number | null;
  valueIndex: number | null;
}

/* ------------------------------------------------------------------ */
/* status chips (unchanged behaviour)                                  */
/* ------------------------------------------------------------------ */

/** Status text → tinted chip (icons + text; never colour alone). */
const STATUS_TONE: { match: RegExp; cls: string }[] = [
  { match: /^Certified —/, cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" },
  { match: /Conditionality/, cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" },
  { match: /Recertification Due/, cls: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300" },
  { match: /Deferred/, cls: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300" },
  { match: /Not Eligible/, cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300" },
  { match: /Eligible/, cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" },
  { match: /Scheduled/, cls: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300" },
  { match: /Completed/, cls: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300" },
  { match: /Result Awaited|Awaited/, cls: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300" },
  { match: /Good/, cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" },
  { match: /Dilapidated|Expired|Not Obtained/, cls: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300" },
  { match: /Expiring Soon|Needs Repair|Pending/, cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" },
  { match: /Valid/, cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" },
];

function statusChipCls(value: CellValue): string | null {
  if (value == null) return null;
  const s = String(value);
  return (
    STATUS_TONE.find((t) => t.match.test(s))?.cls ??
    "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"
  );
}

export function PivotTable({
  result,
  layout,
  decimals,
  style,
  formatMode,
  valueLabels = "auto",
  statusColIndexes,
  colWidths,
  onColWidthsChange,
  onToggleCollapse,
  onSort,
  sortState,
  onCellClick,
}: {
  result: PivotResult;
  layout: Layout;
  decimals: DecimalOption;
  style: ReportStyle;
  formatMode: FormatMode;
  valueLabels: ValueLabelsMode;
  /** Column indexes (0-based over all columns) that hold status values. */
  statusColIndexes: Set<number>;
  colWidths: Record<string, number>;
  onColWidthsChange: (next: Record<string, number>) => void;
  onToggleCollapse: (key: string) => void;
  onSort: (
    kind: "label" | "measure" | "total",
    arg?: { colIndex?: number; vIndex?: number },
  ) => void;
  sortState: (
    kind: "label" | "measure" | "total",
    arg?: { colIndex?: number; vIndex?: number },
  ) => "asc" | "desc" | null;
  onCellClick?: (t: DrillTarget) => void;
}) {
  const { rowFields, colFields, colCombos, valueSpecs, valueFields, outRows } = result;
  const compact = layout === "compact";
  const tabular = layout === "tabular";
  const valueCount = Math.max(valueSpecs.length, 1);
  const labelCount = Math.max(rowFields.length, 1);

  /* THE header model:
     - level 1 = the column-combo labels (only when a column field exists),
     - level 2 = the measure (value) names — shown only for 2+ values (Auto)
       or when the user forces "Always"; a single value is never repeated per
       column, the corner cell carries it once instead,
     - the Grand Total column exists ONLY when a column field exists. */
  const showLabels =
    valueLabels === "always" || (valueLabels === "auto" && valueSpecs.length > 1);
  const grandCols = style.grandTotalColumn && colFields.length > 0;
  /** Total header rows (1 at minimum — a single label row). */
  const headerRows = Math.max(1, colFields.length + (showLabels ? 1 : 0));

  const bodyRows = useMemo(() => outRows.filter((r) => r.kind !== "grand"), [outRows]);
  const grandRow = useMemo(() => outRows.find((r) => r.kind === "grand") ?? null, [outRows]);

  const totalCols =
    labelCount + colCombos.length * valueCount + (grandCols ? valueSpecs.length : 0);

  /* column maxima for the heatmap / data-bar colouring */
  const colMax = useMemo(() => {
    const max: number[] = [];
    for (const row of outRows) {
      const cells = [...row.measures, ...(grandCols ? row.totals : [])];
      cells.forEach((c, i) => {
        if (typeof c === "number" && (max[i] ?? 0) < c) max[i] = c;
      });
    }
    return max;
  }, [outRows, grandCols]);

  const startResize = (key: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).parentElement;
    const startX = e.clientX;
    const startW = colWidths[key] ?? th?.offsetWidth ?? 140;
    const onMove = (ev: MouseEvent) =>
      onColWidthsChange({
        ...colWidths,
        [key]: Math.max(64, Math.round(startW + ev.clientX - startX)),
      });
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  /** Numeric columns size from their content with a 90px minimum; an explicit
   *  drag override wins. */
  const widthStyle = (key: string, min = 90): React.CSSProperties => {
    const w = colWidths[key];
    return w ? { width: w, minWidth: w } : { minWidth: min };
  };

  const sortIcon = (dir: "asc" | "desc" | null) =>
    dir ? (
      <span className="ml-1 text-[10px] text-primary">{dir === "asc" ? "▲" : "▼"}</span>
    ) : null;

  /** Display labels ("Oct 2022", "(No date)") — the raw `labels` stay the
   *  drill-down key so a click still filters the underlying facilities. */
  const displayLabels = (row: PivotOutRow, prev: PivotOutRow | null) => {
    const src = row.displayLabels ?? row.labels;
    const labels = src.map((l, i) => (i <= row.depth ? l : null));
    if (tabular) return labels;
    return labels.map((l, i) =>
      i !== row.depth && prev && prev.labels[i] === row.labels[i] ? null : l,
    );
  };

  const rowBg = (row: PivotOutRow, index: number) =>
    cn(
      row.kind === "grand" && "bg-primary/10 font-bold",
      row.kind === "subtotal" && "bg-primary/[0.06] font-semibold",
      row.kind === "leaf" && style.striped && index % 2 === 1 && "bg-muted/25",
    );

  const stickyCol = !compact;

  const measureCell = (
    cell: CellValue,
    flatIndex: number,
    colIndex: number,
    rowIndex: number,
    row: PivotOutRow,
    onClick?: () => void,
  ) => {
    const v = flatIndex % valueCount;
    const formatted = formatCell(cell, valueFields[v], valueSpecs[v], decimals);
    const chipCls =
      formatMode === "chips" && statusColIndexes.has(colIndex)
        ? statusChipCls(cell)
        : null;
    const isNum = typeof cell === "number";
    const heat =
      formatMode === "heatmap" && isNum && (colMax[flatIndex] ?? 0) > 0
        ? { background: `oklch(0.86 0.09 165 / ${0.15 + 0.55 * (cell as number) / colMax[flatIndex]})` }
        : undefined;
    const bar =
      formatMode === "databars" && isNum && (colMax[flatIndex] ?? 0) > 0
        ? {
            backgroundImage:
              "linear-gradient(to left, oklch(0.75 0.13 165 / 0.35) 0%, oklch(0.75 0.13 165 / 0.35) 100%)",
            backgroundSize: `${Math.max(4, (100 * (cell as number)) / colMax[flatIndex])}% 100%`,
            backgroundRepeat: "no-repeat",
          }
        : undefined;
    return (
      <TableCell
        key={`c-${rowIndex}-${colIndex}`}
        colSpan={1}
        className={cn(
          "text-right tabular-nums",
          style.borders && "border-r border-border/50",
          style.highlightTotals && row.kind !== "leaf" && "font-semibold",
          row.kind === "grand" && "font-bold",
          chipCls && "px-1.5",
          cell == null && "text-muted-foreground/70",
        )}
        style={heat ?? bar}
      >
        {chipCls ? (
          <span
            className={cn(
              "inline-block max-w-full truncate rounded-full border border-transparent px-2 py-0.5 text-xs font-medium",
              chipCls,
            )}
          >
            {formatted}
          </span>
        ) : onClick ? (
          <button
            type="button"
            onClick={onClick}
            data-tip="Click to see the facilities behind this figure"
            className="w-full rounded text-inherit hover:underline"
          >
            {formatted}
          </button>
        ) : (
          formatted
        )}
      </TableCell>
    );
  };

  /* The corner: the row-field label "A › B"; without row fields the caption
     "Values: <measure>" takes its place (the measure appears EXACTLY once). */
  const cornerText =
    rowFields.map((f) => f.label).join(" › ") ||
    (valueSpecs.length === 1
      ? `Values: ${measureLabel(valueSpecs[0], valueFields[0])}`
      : "Values");
  const cornerTitle =
    rowFields.length === 0 && valueSpecs.length > 0
      ? `Values: ${valueSpecs
          .map((s, v) => measureLabel(s, valueFields[v]))
          .join(" · ")}`
      : cornerText;

  return (
    <StickyTableScroll className="glass" maxHeight="60vh" minHeight="320px">
      <Table>
        <TableHeader>
          {colFields.length === 0 ? (
            /* ---- No column field: ONE header row = corner + value columns. ---- */
            <TableRow>
              <Th
                sticky={stickyCol}
                colSpan={labelCount}
                className="border-r border-border/60 bg-muted/60 align-bottom"
                data-tip={cornerTitle}
              >
                <button type="button" onClick={() => onSort("label")} className="inline-flex items-center">
                  <span className="truncate">{cornerText}</span>
                  {sortIcon(sortState("label"))}
                </button>
              </Th>
              {valueSpecs.map((spec, v) => (
                <TableHead
                  key={`mv-${spec.fieldId}-${v}`}
                  style={widthStyle(`v:${v}`)}
                  className="relative border-r border-border/60 bg-muted/40 text-right"
                  data-tip={measureLabel(spec, valueFields[v])}
                >
                  {(showLabels || valueSpecs.length > 1) && (
                    <button
                      type="button"
                      className="inline-flex items-center"
                      onClick={() => onSort("measure", { colIndex: 0, vIndex: v })}
                    >
                      {measureLabel(spec, valueFields[v])}
                      {sortIcon(sortState("measure", { colIndex: 0, vIndex: v }))}
                    </button>
                  )}
                  <ResizeHandle onMouseDown={startResize(`v:${v}`)} />
                </TableHead>
              ))}
            </TableRow>
          ) : (
            <>
              {/* ---- Level 1: the column-field values (+ the ONE Grand
                      Total column when a column field exists). The corner
                      spans ALL header rows via rowspan, so it can never
                      overlap another header row. ---- */}
              {colFields.map((field, level) => (
                <TableRow key={field.id}>
                  {level === 0 && (
                    <Th
                      sticky={stickyCol}
                      rowSpan={headerRows}
                      colSpan={labelCount}
                      className="border-r border-border/60 bg-muted/60 align-bottom"
                      data-tip={cornerTitle}
                    >
                      <button type="button" onClick={() => onSort("label")} className="inline-flex items-center gap-2">
                        <span className="min-w-0 truncate">{cornerText}</span>
                        {/* The measure shown EXACTLY once — with a single
                            value the corner caption carries its name. */}
                        {valueSpecs.length === 1 && !showLabels && (
                          <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                            Values: {measureLabel(valueSpecs[0], valueFields[0])}
                          </span>
                        )}
                        {sortIcon(sortState("label"))}
                      </button>
                    </Th>
                  )}
                  {colCombos.map((combo, cIndex) => {
                    const label =
                      (combo.displayLabels ?? combo.labels)[level] ?? "(blank)";
                    const prev = colCombos[cIndex - 1];
                    if (prev && prev.labels[level] === combo.labels[level]) return null;
                    return (
                      <TableHead
                        key={`hl-${combo.key}`}
                        /* the group band spans EXACTLY its visible sub-columns */
                        colSpan={countSpan(colCombos, cIndex, level) * valueCount}
                        className="border-r border-b border-border/60 bg-muted/50 text-center"
                      >
                        <button
                          type="button"
                          className="inline-flex max-w-full items-center gap-1 truncate"
                          data-tip={`Sort rows by ${label}`}
                          onClick={() => onSort("measure", { colIndex: cIndex, vIndex: 0 })}
                        >
                          <span className="truncate">{label}</span>
                          {sortIcon(sortState("measure", { colIndex: cIndex, vIndex: 0 }))}
                        </button>
                      </TableHead>
                    );
                  })}
                  {level === 0 && grandCols && (
                    <TableHead
                      /* the ONE grand band spans exactly its sub-columns
                         (one per value) — never a second grand column: */
                      colSpan={valueCount > 1 ? valueCount : undefined}
                      rowSpan={!showLabels ? headerRows : undefined}
                      className="border-l border-border/60 bg-primary/10 text-right align-bottom"
                      data-tip="Totals across every column"
                    >
                      {/* The measure name is printed ONCE, in the corner
                          caption — a Grand Total header repeats nothing. */}
                      Grand Total
                    </TableHead>
                  )}
                </TableRow>
              ))}
              {/* ---- Level 2: the one row of value names — present only
                      with 2+ values (or "Always"); absent with one value. ---- */}
              {showLabels && (
                <TableRow data-testid="pivot-value-labels">
                  {/* the corner slot is already occupied by the rowspan */}
                  {colCombos.flatMap((combo, cIndex) =>
                    valueSpecs.map((spec, v) => (
                      <TableHead
                        key={`m-${combo.key}-${v}`}
                        style={widthStyle(`m:${cIndex}:${v}`)}
                        className="relative border-r border-border/60 bg-muted/40 text-right"
                        data-tip={`${measureLabel(spec, valueFields[v])}${
                          combo.labels.length
                            ? ` — ${combo.labels.map((l) => l ?? "(blank)").join(" · ")}`
                            : ""
                        }`}
                      >
                        <button
                          type="button"
                          className="inline-flex items-center"
                          onClick={() => onSort("measure", { colIndex: cIndex, vIndex: v })}
                        >
                          {measureLabel(spec, valueFields[v])}
                          {sortIcon(sortState("measure", { colIndex: cIndex, vIndex: v }))}
                        </button>
                        <ResizeHandle onMouseDown={startResize(`m:${cIndex}:${v}`)} />
                      </TableHead>
                    )),
                  )}
                  {grandCols &&
                    valueSpecs.map((spec, v) => (
                      <TableHead
                        key={`tot-head-${v}`}
                        style={widthStyle(`tot:${v}`)}
                        className="relative border-l border-border/60 bg-primary/10 text-right align-bottom"
                        data-tip={`Grand Total — ${measureLabel(spec, valueFields[v])}`}
                      >
                        <button
                          type="button"
                          className="inline-flex items-center"
                          onClick={() => onSort("total", { vIndex: v })}
                        >
                          {AGG_LABELS[spec.agg]}
                          {sortIcon(sortState("total", { vIndex: v }))}
                        </button>
                        <ResizeHandle onMouseDown={startResize(`tot:${v}`)} />
                      </TableHead>
                    ))}
                </TableRow>
              )}
            </>
          )}
        </TableHeader>

        <TableBody>
          {bodyRows.length === 0 && !grandRow && (
            <TableRow>
              <TableCell
                colSpan={totalCols}
                className="py-10 text-center text-muted-foreground"
              >
                No facilities match the current filters.
              </TableCell>
            </TableRow>
          )}
          {bodyRows.map((row, index) => {
            const prev = index > 0 ? bodyRows[index - 1] : null;
            const labels = displayLabels(row, prev);
            const isGroupRow = row.kind !== "leaf";
            const leafOnlyIndex = bodyRows
              .slice(0, index)
              .filter((r) => r.kind === "leaf").length;
            const bg = rowBg(row, row.kind === "leaf" ? leafOnlyIndex : index);
            return (
              <TableRow key={`${row.key}-${index}`} className={bg}>
                {compact ? (
                  <TableCell
                    colSpan={labelCount}
                    className={cn(
                      style.borders && "border-r border-border/50",
                      stickyCol && "sticky left-0 z-10",
                      bg || "bg-background",
                    )}
                  >
                    <div
                      className="flex items-center gap-1.5"
                      style={{ paddingLeft: row.depth * 14 }}
                    >
                      {isGroupRow && (
                        <button
                          type="button"
                          onClick={() => onToggleCollapse(row.key)}
                          data-tip={row.collapsed ? "Expand group" : "Collapse group"}
                          aria-label={row.collapsed ? "Expand group" : "Collapse group"}
                          aria-expanded={!row.collapsed}
                          className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                        >
                          {row.collapsed ? (
                            <ChevronRight className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </button>
                      )}
                      <span className="truncate">
                        {row.displayLabels?.[row.depth] ??
                          row.labels[row.depth] ??
                          rowFields[row.depth]?.blankLabel ??
                          "(blank)"}
                      </span>
                      <span className="ml-1 shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        ({row.count})
                      </span>
                    </div>
                  </TableCell>
                ) : isGroupRow ? (
                  /* Subtotal rows: the parent levels keep their labels, then
                     ONE cell seats "Total — <label>" and spans every
                     row-label column from that level to the last — the
                     first value cell therefore always starts under the
                     first value header (same model as the exports). */
                  rowFields.map((rf, i) => {
                    if (i > row.depth) return null;
                    const isOwn = i === row.depth;
                    const span = isOwn ? labelCount - row.depth : 1;
                    return (
                      <TableCell
                        key={rf.id}
                        colSpan={span > 1 ? span : undefined}
                        className={cn(
                          "whitespace-nowrap",
                          style.borders && "border-r border-border/50",
                          isOwn && "font-semibold",
                          !isOwn && "font-medium",
                          stickyCol && i === 0 && "sticky left-0 z-10",
                          stickyCol && i === 0 && (bg ? bg : "bg-background"),
                        )}
                        style={{
                          paddingLeft: (tabular ? 0 : i * 10) + 10,
                          ...widthStyle(`row:${rf.id}`, 120),
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          {isOwn && (
                            <button
                              type="button"
                              onClick={() => onToggleCollapse(row.key)}
                              data-tip={row.collapsed ? "Expand group" : "Collapse group"}
                              aria-expanded={!row.collapsed}
                              className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                            >
                              {row.collapsed ? (
                                <ChevronRight className="size-3.5" />
                              ) : (
                                <ChevronDown className="size-3.5" />
                              )}
                            </button>
                          )}
                          <span>
                            {isOwn
                              ? `Total — ${labels[i] ?? rowFields[i]?.blankLabel ?? "(blank)"}`
                              : labels[i] ?? ""}
                          </span>
                        </div>
                      </TableCell>
                    );
                  })
                ) : (
                  rowFields.map((rf, i) => (
                    <TableCell
                      key={rf.id}
                      className={cn(
                        "whitespace-nowrap",
                        style.borders && "border-r border-border/50",
                        i === 0 && "font-medium",
                        stickyCol && i === 0 && "sticky left-0 z-10",
                        stickyCol && i === 0 && (bg ? bg : "bg-background"),
                      )}
                      style={{ paddingLeft: (tabular ? 0 : i * 10) + 10, ...widthStyle(`row:${rf.id}`, 120) }}
                    >
                      <div className="flex items-center gap-1.5">
                        {isGroupRow && i === row.depth && (
                          <button
                            type="button"
                            onClick={() => onToggleCollapse(row.key)}
                            data-tip={row.collapsed ? "Expand group" : "Collapse group"}
                            aria-expanded={!row.collapsed}
                            className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                          >
                            {row.collapsed ? (
                              <ChevronRight className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )}
                          </button>
                        )}
                        {i === row.depth && labels[i] == null && !isGroupRow ? (
                          <span className="italic text-muted-foreground">
                            {rowFields[i]?.blankLabel ?? "(blank)"}
                          </span>
                        ) : (
                          <span className={cn(labels[i] == null && "relative")}>
                            {labels[i] ?? ""}
                          </span>
                        )}
                        {!isGroupRow && i === row.depth && row.count > 0 && (
                          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                            ({row.count})
                          </span>
                        )}
                      </div>
                    </TableCell>
                  ))
                )}

                {row.measures.map((cell, i) => {
                  const colIndex = labelCount + i;
                  const cIndex = Math.floor(i / valueCount);
                  const v = i % valueCount;
                  return measureCell(
                    cell,
                    i,
                    colIndex,
                    index,
                    row,
                    onCellClick
                      ? () => onCellClick({ row, comboIndex: cIndex, valueIndex: v })
                      : undefined,
                  );
                })}
                {grandCols &&
                  row.totals.map((cell, v) =>
                    measureCell(
                      cell,
                      colCombos.length * valueCount + v,
                      labelCount + colCombos.length * valueCount + v,
                      index,
                      row,
                    ),
                  )}
              </TableRow>
            );
          })}
        </TableBody>

        {/* ---- THE Grand Total row: exactly one, pinned to the bottom of
                the scrollport (sticky footer). ---- */}
        {grandRow && (
          <TableFooter className="sticky bottom-0 z-20 border-t-2 border-border">
            <TableRow className="bg-primary/10 font-bold">
              {/* The Grand Total label merges across ALL row-label columns
                  (one cell — same model as the exports). */}
              <TableCell
                colSpan={labelCount}
                className={cn(
                  compact && "",
                  stickyCol ? "sticky left-0 z-10 bg-primary/10" : "bg-primary/10",
                  style.borders && "border-r border-border/50",
                )}
              >
                {rowFields.length > 0 ? "Grand Total" : ""}
              </TableCell>
              {grandRow.measures.map((cell, i) => {
                const v = i % valueCount;
                const formatted = formatCell(
                  cell,
                  valueFields[v],
                  valueSpecs[v],
                  decimals,
                );
                return (
                  <TableCell
                    key={`gfm-${i}`}
                    className={cn(
                      "text-right tabular-nums font-bold",
                      style.borders && "border-r border-border/50",
                      cell == null && "text-muted-foreground/70",
                    )}
                  >
                    {formatted}
                  </TableCell>
                );
              })}
              {grandCols &&
                grandRow.totals.map((cell, v) => {
                  const formatted = formatCell(
                    cell,
                    valueFields[v],
                    valueSpecs[v],
                    decimals,
                  );
                  return (
                    <TableCell
                      key={`gft-${v}`}
                      className={cn(
                        "text-right tabular-nums font-bold border-l border-border/60",
                        cell == null && "text-muted-foreground/70",
                      )}
                    >
                      {formatted}
                    </TableCell>
                  );
                })}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </StickyTableScroll>
  );
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

/** Header cell used for the corner label header (with optional sticky
 *  behaviour). */
function Th({
  sticky,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { sticky?: boolean }) {
  return (
    <TableHead
      {...props}
      className={cn(props.className, sticky && "sticky left-0 z-20 bg-muted/60")}
    />
  );
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <span
      onMouseDown={onMouseDown}
      data-tip="Drag to resize this column"
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
    />
  );
}

function countSpan(
  combos: { labels: (string | null)[] }[],
  start: number,
  level: number,
): number {
  const label = combos[start].labels[level];
  let n = 1;
  for (let i = start + 1; i < combos.length; i += 1) {
    if (combos[i].labels[level] !== label) break;
    n += 1;
  }
  return n;
}

/** Which on-screen column indexes hold status values (for chip colouring). */
export function statusColumnIndexes(
  rowFields: PivotFieldDef[],
  result: PivotResult,
): Set<number> {
  const ids = new Set(rowFields.map((f) => f.id));
  const out = new Set<number>();
  const labelCount = Math.max(rowFields.length, 1);
  const valueCount = Math.max(result.valueSpecs.length, 1);
  result.valueFields.forEach((f, v) => {
    if (f && STATUS_FIELD_ID_SET.has(f.id)) {
      for (let c = 0; c < result.colCombos.length; c += 1)
        out.add(labelCount + c * valueCount + v);
    }
  });
  rowFields.forEach((f, i) => ids.has(f.id) && out.delete(i));
  return out;
}

const STATUS_FIELD_ID_SET = new Set([
  "pipelineStatus",
  "certStatus",
  "saStatus",
  "genDoc",
  "buildingStatus",
  "nocStatus",
  "eligibility",
  "recertStatus",
]);
