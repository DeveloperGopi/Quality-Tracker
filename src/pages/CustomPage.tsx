import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "convex/react";
import { AlertTriangle, ArrowDown, ArrowUp, Download, FileText, Search } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { FacilityCell } from "@/components/FacilityCell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MASTER_COLUMNS, cellText, type MasterRow } from "@/lib/masterColumns";
import { lineListTemplate, type LineListDefinition } from "@/lib/lineListTemplates";
import { applyLineListFilters, sortLineListRows } from "@/lib/lineListEngine";
import { todayLocalIso } from "@/lib/today";
import {
  DEFAULT_LINE_LIST_EXPORT,
  runLineListExport,
  type LineListExportPlan,
} from "@/lib/lineListExport";
import {
  PivotTable,
  statusColumnIndexes,
  type FormatMode,
  type Layout,
  type ReportStyle,
  type ValueLabelsMode,
} from "@/components/custom-report/PivotTable";
import { ExportDialog } from "@/components/custom-report/ExportDialog";
import {
  applyDateLabelOptions,
  buildPivot,
  createPivotFields,
  defaultPivotConfig,
  prunePivotConfig,
  type DecimalOption,
  type PivotConfig,
  type PivotFieldDef,
} from "@/lib/pivot";
import { useAuth } from "@/hooks/use-auth";

function saveBlobRaw(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const DEFAULT_STYLE: ReportStyle = {
  subtotals: true,
  grandTotals: true,
  grandTotalColumn: true,
  striped: true,
  borders: true,
  highlightTotals: true,
};

type ReportSnapshot = {
  config?: PivotConfig;
  layout?: Layout;
  decimals?: DecimalOption;
  style?: Partial<ReportStyle>;
  formatMode?: FormatMode;
  valueLabels?: ValueLabelsMode;
  monthLabels?: "friendly" | "iso";
};

/** A custom page created in Admin → Pages (`/p/:slug`). */
export default function CustomPage() {
  const { slug = "" } = useParams();
  const page = useQuery(api.pages.getBySlug, { slug });
  const settings = useQuery(api.facilities.getAppSettings, {});
  const { user } = useAuth();
  const def = (page?.definition ?? {}) as Record<string, unknown> & {
    columns?: string[];
    cycle?: string;
    summaryOn?: boolean;
    templateId?: string;
    reportSnapshot?: ReportSnapshot | null;
  };
  const sourceQ = useQuery(
    api.reportDefinitions.get,
    page?.sourceReportId ? { id: page.sourceReportId } : "skip",
  );
  const data = useQuery(api.ops.listFacilityRowsFast, {
    cycle: def.cycle === "all" ? "all" : "current",
  });
  const [query, setQuery] = useState("");
  const [activeQuick, setActiveQuick] = useState<string[]>(() =>
    Array.isArray(def.quick) ? (def.quick as string[]) : [],
  );
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [desc, setDesc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "xlsx">("pdf");
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  /* The wizard's saved quick filters only arrive with the page query. */
  useEffect(() => {
    if (!page) return;
    const saved = Array.isArray(def.quick) ? (def.quick as string[]) : [];
    // Older pages stored the filter test string; normalise to template ids.
    setActiveQuick(
      saved
        .map(
          (value) =>
            template.quickFilters.find((f) => f.id === value || f.test === value)?.id,
        )
        .filter((value): value is string => !!value),
    );
    const firstSort = (def.sort as { id: string; desc: boolean }[] | undefined)?.[0];
    if (firstSort) {
      setSortKey(firstSort.id);
      setDesc(!!firstSort.desc);
    } else {
      setSortKey(null);
      setDesc(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id]);

  const columns = useMemo(
    () =>
      MASTER_COLUMNS.filter(
        (c) => def.columns?.includes(c.key) || c.pinned === true,
      ),
    [def.columns],
  );
  const overrides = (settings?.settings.tableHeaderOverrides ?? {}) as Record<
    string,
    string
  >;
  const labelOf = (key: string, fallback: string) =>
    overrides[fallback] ?? fallback;

  const allRows = (data?.rows ?? []) as unknown as MasterRow[];
  const template = useMemo(
    () => lineListTemplate((def.templateId as string | undefined) ?? "custom"),
    [def.templateId],
  );
  const lineListDef = useMemo(
    () =>
      ({
        ...def,
        columns,
        sort: (def.sort as { id: string; desc: boolean }[] | undefined) ?? [],
        quick: activeQuick,
        and: Array.isArray(def.and) ? def.and : [],
        or: Array.isArray(def.or) ? def.or : [],
        blocks: Array.isArray(def.blocks) ? def.blocks : [],
        phcs: Array.isArray(def.phcs) ? def.phcs : [],
        types: Array.isArray(def.types) ? def.types : [],
        statuses: Array.isArray(def.statuses) ? def.statuses : [],
      }) as unknown as LineListDefinition,
    [def, columns, activeQuick],
  );
  const rows = useMemo(() => {
    const scoped = applyLineListFilters(
      allRows,
      lineListDef,
      template,
      todayLocalIso(),
    );
    const q = query.trim().toLowerCase();
    const filtered = q
      ? scoped.filter((r) =>
          columns.some((c) => cellText(r, c.key).toLowerCase().includes(q)),
        )
      : scoped;
    if (!sortKey) return sortLineListRows(filtered, lineListDef.sort);
    return [...filtered].sort((a, b) => {
      const cmp = cellText(a, sortKey).localeCompare(cellText(b, sortKey), undefined, {
        numeric: true,
      });
      return desc ? -cmp : cmp;
    });
  }, [allRows, columns, query, sortKey, desc, lineListDef, template]);

  const groupedRows = useMemo(() => {
    const groupBy = (def.groupBy as string | null | undefined) ?? null;
    if (!groupBy) return [{ key: null as string | null, rows }];
    const groups = new Map<string, MasterRow[]>();
    for (const row of rows) {
      const key = cellText(row, groupBy).trim() || "(blank)";
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, list]) => ({ key, rows: list }));
  }, [rows, def.groupBy]);

  const snapshot = def.reportSnapshot ?? {};
  const reportConfig = useMemo(
    () => prunePivotConfig(snapshot.config ?? defaultPivotConfig(), new Set()),
    [snapshot.config],
  );
  const reportFields = useMemo(
    () =>
      applyDateLabelOptions(
        createPivotFields(settings?.settings as Record<string, unknown> | undefined),
        snapshot.monthLabels ?? "friendly",
      ),
    [settings, snapshot.monthLabels],
  );
  const reportStyle = { ...DEFAULT_STYLE, ...(snapshot.style ?? {}) };
  const searchableRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return allRows;
    return allRows.filter((row) => {
      const f = (row as unknown as { facility?: Record<string, unknown> }).facility ?? {};
      return [f.name, f.ninNumber, f.block, f.phc, f.facilityType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [allRows, query]);
  const reportResult = useMemo(
    () =>
      buildPivot({
        rows: searchableRows as never,
        fields: reportFields,
        config: reportConfig,
        collapsed: new Set<string>(),
        options: {
          showSubtotals: reportStyle.subtotals,
          showGrandTotals: reportStyle.grandTotals,
        },
      }),
    [searchableRows, reportFields, reportConfig, reportStyle.subtotals, reportStyle.grandTotals],
  );

  const title = page?.name ?? "Page";
  const isReport = page?.type === "report";
  const sourceGone =
    isReport && !!page?.sourceReportId && (sourceQ?.status === "missing" || sourceQ?.status === "deleted");

  const doExport = async (format: "xlsx" | "pdf") => {
    if (!page) return;
    setBusy(true);
    try {
      const plan: LineListExportPlan = {
        ...DEFAULT_LINE_LIST_EXPORT,
        format,
        includeSummary: def.summaryOn ?? false,
      };
      await runLineListExport({
        plan,
        rows,
        columns,
        labels: Object.fromEntries(columns.map((c) => [c.key, labelOf(c.key, c.label)])),
        topic: page.name,
        filtersText: query ? `Search: ${query}` : "No filters",
        generatedBy: user?.name ?? user?.email ?? "State Admin",
        district:
          ((settings?.settings as Record<string, unknown> | undefined)?.districtName as string) ||
          "District",
        singleBlock: null,
        totalRows: allRows.length,
        saveBlob: (buf, name) => saveBlobRaw(new Blob([buf]), name),
        saveBlobRaw,
      });
    } finally {
      setBusy(false);
    }
  };

  if (page === null)
    return (
      <AppShell title="Page not found" titleIcon={FileText}>
        <div className="mx-auto max-w-xl py-20 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Page not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This page was removed, hidden, or it is not shared with your role.
          </p>
        </div>
      </AppShell>
    );
  if (!page)
    return (
      <AppShell title="Page" titleIcon={FileText}>
        <div className="p-8 text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );

  return (
    <AppShell title={title} titleIcon={FileText}>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {isReport ? "Saved report" : "Line list"}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isReport
                ? `${allRows.length} facilities in scope · same role and block scope as the Master List`
                : `${rows.length} of ${allRows.length} facilities · same role and block scope as the Master List`}
            </p>
          </div>
          {(page.allowDownload ?? false) && (
            <div className="flex gap-2">
              {isReport ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sourceGone}
                    onClick={() => {
                      setExportFormat("xlsx");
                      setExportOpen(true);
                    }}
                  >
                    <Download className="mr-1.5 h-4 w-4" /> Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sourceGone}
                    onClick={() => {
                      setExportFormat("pdf");
                      setExportOpen(true);
                    }}
                  >
                    <Download className="mr-1.5 h-4 w-4" /> PDF
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => void doExport("xlsx")}>
                    <Download className="mr-1.5 h-4 w-4" /> Excel
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => void doExport("pdf")}>
                    <Download className="mr-1.5 h-4 w-4" /> PDF
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {sourceGone && (
          <div
            data-testid="source-report-removed"
            className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          >
            <AlertTriangle className="size-4" />
            <span className="font-semibold">Source report removed.</span>
            <span>
              The saved Report Builder view behind this page was deleted, so the
              page cannot refresh. A State Admin can recreate it in Admin → Pages.
            </span>
          </div>
        )}

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this list…"
            className="pl-8"
          />
        </div>

        {!isReport && template.quickFilters.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.quickFilters.map((f) => {
              const on = activeQuick.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setActiveQuick((cur) =>
                      on ? cur.filter((x) => x !== f.id) : [...cur, f.id],
                    )
                  }
                  className={
                    on
                      ? "rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                      : "rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {isReport ? (
          reportResult.outRows.length ? (
            <PivotTable
              result={reportResult}
              layout={snapshot.layout ?? "compact"}
              decimals={snapshot.decimals ?? "auto"}
              style={reportStyle}
              formatMode={snapshot.formatMode ?? "off"}
              valueLabels={snapshot.valueLabels ?? "auto"}
              statusColIndexes={statusColumnIndexes(
                reportResult.rowFields as PivotFieldDef[],
                reportResult,
              )}
              colWidths={colWidths}
              onColWidthsChange={setColWidths}
              onToggleCollapse={() => undefined}
              onSort={() => undefined}
              sortState={() => null}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
              No rows match this report.
            </div>
          )
        ) : (
          <div className="overflow-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      <button className="inline-flex items-center gap-1" onClick={() => {
                        if (sortKey === c.key) setDesc((d) => !d);
                        else {
                          setSortKey(c.key);
                          setDesc(false);
                        }
                      }}>
                        {labelOf(c.key, c.label)}
                        {sortKey === c.key &&
                          (desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((group, gi) => (
                  <Fragment key={group.key ?? `all-${gi}`}>
                    {group.key !== null && (
                      <tr className="border-t bg-muted/40">
                        <td
                          colSpan={columns.length}
                          className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                        >
                          {group.key} · {group.rows.length}
                        </td>
                      </tr>
                    )}
                    {group.rows.map((row, i) => (
                      <tr
                        key={String((row as { facility?: { _id?: string } }).facility?._id ?? i)}
                        className="border-t"
                      >
                        {columns.map((c) => (
                          <td key={c.key} className="whitespace-nowrap px-3 py-2">
                            {c.key === "facility" &&
                            (row as { facility?: { _id?: string; name?: string | null } })
                              .facility ? (
                              <FacilityCell
                                facility={
                                  (row as { facility: { _id?: string; name?: string | null } })
                                    .facility
                                }
                                query={query}
                                className="max-w-72"
                              />
                            ) : (
                              cellText(row, c.key) || "—"
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                      No facilities match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {isReport && page.allowDownload && !sourceGone && (
          <ExportDialog
            open={exportOpen}
            onOpenChange={setExportOpen}
            result={reportResult}
            rawRows={searchableRows as never}
            filtersList={[]}
            chart={null}
            initialFormat={exportFormat}
            defaultTitle={page.name}
            defaultSubtitle="Facility quality certification tracker"
            defaultDistrict={
              ((settings?.settings as Record<string, unknown> | undefined)?.districtName as string) ||
              "District"
            }
            defaultGeneratedBy={user?.name ?? user?.email ?? "State Admin"}
          />
        )}
      </div>
    </AppShell>
  );
}
