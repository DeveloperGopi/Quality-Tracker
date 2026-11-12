/**
 * NQAS SUMMARY REPORT — a scrolling report, not a wall of 16:9 slides.
 *
 * Every number, title and note comes from the SAME shared model as Generate
 * PPT (lib/deckModel). The page adds report-only affordances: a sticky
 * one-row filter bar, a clickable headline strip, a scroll-spied contents
 * list, per-card actions, one Data quality card and a "Generate deck" handoff
 * that keeps the scope and the hidden sections.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  FileDown,
  FileSpreadsheet,
  Loader2,
  MoreHorizontal,
  Printer,
  Presentation,
  ShieldAlert,
  Table2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { CycleFilter, useCycleScope } from "@/components/CycleFilter";
import FilterDropdown from "@/components/FilterDropdown";
import { DeckBlocksView } from "@/components/deck/DeckSlidePreview";
import { buildEligibilityOptions } from "@/lib/eligibility";
import { multiFilterMatches } from "@/lib/multiFilter";
import {
  DECK_SECTIONS,
  DEFAULT_HIDDEN_SLIDES,
  DEFAULT_SLIDE_ORDER,
  buildDeckModel,
  parseRateBands,
  type DeckModel,
  type DeckPeriod,
  type DeckSectionId,
  type DeckSlide,
  type DeckSlideId,
  type SlideBlock,
} from "@/lib/deckModel";
import type { DeckRow } from "@/lib/deck";
import type { DeckDensity, DeckTheme } from "@/lib/deckDesign";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ReportRow = NonNullable<
  ReturnType<typeof useQuery<typeof api.modules.getReportData>>
>["rows"][number];

function toDeckRow(r: ReportRow): DeckRow {
  return {
    facility: r.facility,
    type: r.type,
    block: r.block,
    phc: r.phc,
    eligibility: r.eligibility,
    currentStatus: r.currentStatus,
    certStatus: r.certStatus,
    naStatus: r.naStatus,
    certDate: r.certDate,
    certScore: r.certScore,
    naScheduledDate: r.naScheduledDate,
    saStatus: r.saStatus,
    generalDocStatus: r.generalDocStatus,
    naMode: r.naMode,
    saScore: r.saScore,
    buildingStatus: r.buildingStatus,
    buildingType: r.buildingType,
    fireNocStatus: r.fireNocStatus ?? null,
    fireNocExpiry:
      ("fireNocExpiry" in r ? (r as { fireNocExpiry?: string | null }).fireNocExpiry : undefined) ??
      null,
    nqasIaQ1: r.nqasIaQ1,
    nqasIaQ2: r.nqasIaQ2,
    kayakalpIaQ1: r.kayakalpIaQ1,
    kayakalpIaQ2: r.kayakalpIaQ2,
    surveillanceDue1: r.surveillanceDue1,
    surveillanceDone1: r.surveillanceDone1,
    surveillanceDue2: r.surveillanceDue2,
    surveillanceDone2: r.surveillanceDone2,
    validityDate: r.validityDate,
    gapClosureAmount: r.gapClosureAmount,
    gcFundYear: r.gcFundYear,
  };
}

const PREFS_VERSION = "v2";
type StoredPrefs = {
  hidden?: DeckSlideId[];
  order?: DeckSlideId[];
  period?: DeckPeriod;
  overrides?: Record<string, unknown>;
  presets?: Record<string, unknown>;
  theme?: string;
  density?: string;
};
const storageKey = (userKey: string) => `nqas.deck.prefs.${PREFS_VERSION}.${userKey}`;

function urlList(key: string): string[] {
  if (typeof window === "undefined") return [];
  const value = new URLSearchParams(window.location.search).get(key);
  return value ? value.split(",").filter(Boolean) : [];
}

function readPrefs(userKey: string): StoredPrefs {
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    return raw ? (JSON.parse(raw) as StoredPrefs) : {};
  } catch {
    return {};
  }
}
function writePrefs(userKey: string, patch: StoredPrefs) {
  try {
    const current = readPrefs(userKey);
    localStorage.setItem(storageKey(userKey), JSON.stringify({ ...current, ...patch }));
  } catch {
    /* storage may be blocked */
  }
}

/* ------------------------------------------------------------------ */
/* Table view (Show as table)                                          */
/* ------------------------------------------------------------------ */

function blockTable(block: SlideBlock): { head: string[]; rows: string[][]; note?: string } | null {
  switch (block.kind) {
    case "kpis":
      return {
        head: ["Measure", "Value", "Note"],
        rows: block.items.map((i) => [i.label, i.value, i.note ?? "-"]),
      };
    case "bars":
      return {
        head: [block.title ?? "Category", "Count"],
        rows: block.items.map((i) => [i.label, i.display ?? String(i.value)]),
        note: block.note,
      };
    case "stacked": {
      const total = block.segments.reduce((a, s) => a + s.value, 0);
      return {
        head: [block.title ?? "Segment", "Facilities", "Share"],
        rows: block.segments.map((s) => [
          s.label,
          String(s.value),
          `${total > 0 ? Math.round((s.value / total) * 100) : 0}%`,
        ]),
        note: block.note,
      };
    }
    case "table":
      return {
        head: block.head,
        rows: [...block.rows, ...(block.totalRow ? [block.totalRow] : [])],
        note: block.note,
      };
    case "heatmap":
      return {
        head: [block.totalLabel, ...block.monthLabels, "Total"],
        rows: [
          ...block.rows.map((r) => [r.label, ...r.cells.map(String), String(r.total)]),
          [block.totalLabel, ...block.totalCells.map(String), String(block.grandTotal)],
        ],
      };
    case "donut": {
      const total = block.segments.reduce((a, s) => a + s.value, 0);
      return {
        head: [block.title ?? "Status", "Facilities", "Share"],
        rows: block.segments.map((s) => [
          s.label,
          String(s.value),
          `${total > 0 ? Math.round((s.value / total) * 100) : 0}%`,
        ]),
        note: block.caption,
      };
    }
    case "cards":
      return {
        head: ["Measure", "Value", "Detail"],
        rows: block.items.map((i) => [i.title, i.big, [i.line, i.body].filter(Boolean).join(" — ")]),
      };
    case "facts":
      return { head: ["Value", "Detail"], rows: block.items.map((i) => [i.big, i.text]) };
    case "takeaways":
      return {
        head: ["#", "Action", "Facilities"],
        rows: block.items.map((i) => [String(i.n), i.title, i.body]),
      };
    case "defs":
      return { head: ["Term", "Definition"], rows: block.items.map((i) => [i.term, i.definition]) };
    case "text":
      return { head: ["Note"], rows: [[block.body]] };
    case "bullets":
      return { head: [block.title ?? "Items"], rows: block.items.map((i) => [i]) };
  }
}

function SlideTables({ slide }: { slide: DeckSlide }) {
  return (
    <div className="space-y-4">
      {slide.columns.flat().map((block, i) => {
        const table = blockTable(block);
        if (!table) return null;
        return (
          <div key={i} className="min-w-0">
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full min-w-[420px] text-xs">
                <thead>
                  <tr className="bg-muted/40">
                    {table.head.map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 ? "bg-muted/20" : undefined}>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={cn(
                            "px-2 py-1.5 align-top",
                            ci > 0 && "text-right tabular-nums",
                          )}
                        >
                          {cell === "" ? "-" : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {table.note && <p className="mt-1 text-[11px] text-muted-foreground">{table.note}</p>}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function KpiTile({
  label,
  value,
  note,
  href,
  tone,
  onClick,
}: {
  label: string;
  value: number | string;
  note?: string;
  href: string;
  tone?: "teal" | "amber" | "coral" | "grey";
  onClick: (href: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(href)}
      className="glass min-w-0 rounded-xl border border-border/60 p-3 text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={cn(
          "mt-1 block text-2xl font-bold tabular-nums",
          tone === "teal" && "text-teal-800",
          tone === "amber" && "text-amber-700",
          tone === "coral" && "text-rose-700",
          tone === "grey" && "text-slate-700",
        )}
      >
        {value}
      </span>
      {note && <span className="mt-0.5 block text-[11px] text-muted-foreground">{note}</span>}
    </button>
  );
}

export default function NqasSummaryReportPage() {
  const data = useQuery(api.modules.getReportData, {});
  const adminSettings = useQuery(api.facilities.getAppSettings, {});
  const navigate = useNavigate();
  const { user } = useAuth();
  const userKey = String((user as { email?: string } | null | undefined)?.email ?? "anonymous");
  const initialPrefs = useMemo(() => readPrefs(userKey), [userKey]);
  // The Generate PPT Design selects are stored under the same per-user key;
  // the report's own PDF export must honour them too.
  const deckTheme: DeckTheme =
    initialPrefs.theme === "dark-cover" || initialPrefs.theme === "high-contrast"
      ? initialPrefs.theme
      : "light";
  const deckDensity: DeckDensity = initialPrefs.density === "compact" ? "compact" : "comfortable";

  const [blockFilter, setBlockFilter] = useState<string[]>(() => urlList("block"));
  const [typeFilter, setTypeFilter] = useState<string[]>(() => urlList("type"));
  const [eligibilityFilter, setEligibilityFilter] = useState<string[]>(() => urlList("elig"));
  const initialUrl = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const [period, setPeriod] = useState<DeckPeriod>(
    initialUrl.get("period") === "calendar" ? "calendar" : initialPrefs.period ?? "fy",
  );
  const [hidden, setHidden] = useState<DeckSlideId[]>(() => {
    const ids = urlList("hidden").filter((id): id is DeckSlideId =>
      (DEFAULT_SLIDE_ORDER as readonly string[]).includes(id),
    );
    return ids.length ? ids : initialPrefs.hidden ?? [...DEFAULT_HIDDEN_SLIDES];
  });
  const [tableMode, setTableMode] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);
  const [activeSection, setActiveSection] = useState<DeckSectionId>("summary");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const cycleScope = useCycleScope();
  const allRows = useMemo(() => data?.rows ?? [], [data]);
  const deckRows = useMemo(() => allRows.map(toDeckRow), [allRows]);
  const blocks = useMemo(() => [...new Set(deckRows.map((r) => r.block))].sort(), [deckRows]);
  const types = useMemo(() => [...new Set(deckRows.map((r) => r.type))].sort(), [deckRows]);
  const eligibilityOptions = buildEligibilityOptions(
    adminSettings?.settings.eligibilityOptions as string[] | undefined,
  );

  const filteredRows = useMemo(
    () =>
      allRows
        .filter((r) => {
          if (!multiFilterMatches(r.block, blockFilter)) return false;
          if (!multiFilterMatches(r.type, typeFilter)) return false;
          if (typeof cycleScope === "number" && r.cycle !== cycleScope) return false;
          if (!multiFilterMatches(r.eligibility ?? "", eligibilityFilter)) return false;
          return true;
        })
        .map(toDeckRow),
    [allRows, blockFilter, typeFilter, cycleScope, eligibilityFilter],
  );

  const filtersLabel = [
    blockFilter.length ? blockFilter.join(", ") : "All blocks",
    typeFilter.length ? typeFilter.join(", ") : "All facility types",
    typeof cycleScope === "number" ? `Cycle #${cycleScope}` : "Current cycle",
  ].join(" · ");

  const model: DeckModel = useMemo(
    () =>
      buildDeckModel(filteredRows, {
        period,
        filtersLabel,
        rateBands: parseRateBands(
          (adminSettings?.settings as Record<string, unknown> | undefined)?.rateBands,
        ),
      }),
    [filteredRows, period, filtersLabel, adminSettings],
  );

  useEffect(() => {
    writePrefs(userKey, { hidden, period });
  }, [hidden, period, userKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const write = (key: string, values: string[]) => {
      if (values.length) params.set(key, values.join(","));
      else params.delete(key);
    };
    write("block", blockFilter);
    write("type", typeFilter);
    write("elig", eligibilityFilter);
    write("hidden", hidden);
    if (period === "calendar") params.set("period", "calendar");
    else params.delete("period");
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [blockFilter, typeFilter, eligibilityFilter, hidden, period]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute("data-report-section") as DeckSectionId | null;
        if (id) setActiveSection(id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.1, 0.3] },
    );
    for (const el of Object.values(sectionRefs.current)) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [data, hidden]);

  const hiddenSet = new Set(hidden);
  const visibleSlides = model.slides.filter((s) => s.id !== "title" && !hiddenSet.has(s.id));
  const hiddenSectionCount = DECK_SECTIONS.filter((section) => {
    const ids = model.slides
      .filter((s) => s.section === section.id && s.id !== "title")
      .map((s) => s.id);
    return ids.length > 0 && ids.every((id) => hiddenSet.has(id));
  }).length;

  const toggleSlide = (id: DeckSlideId) => {
    setHidden((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const showSection = (section: DeckSectionId) => {
    const ids = model.slides.filter((s) => s.section === section).map((s) => s.id);
    setHidden((prev) => prev.filter((id) => !ids.includes(id)));
  };
  const hideSection = (section: DeckSectionId) => {
    const ids = model.slides.filter((s) => s.section === section).map((s) => s.id);
    setHidden((prev) => [...new Set([...prev, ...ids])]);
  };

  const clearAll = () => {
    setBlockFilter([]);
    setTypeFilter([]);
    setEligibilityFilter([]);
  };

  const goList = (query: string) => {
    navigate(`/facilities?${query}`);
  };

  const copyImage = async (slide: DeckSlide) => {
    const el = sectionRefs.current[slide.id];
    if (!el) return;
    try {
      const { snapdom } = await import("@zumer/snapdom");
      const shot = await snapdom(el, { scale: 2 });
      const blob = await shot.toBlob({ type: "png" });
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Section image copied");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slide.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Copy image failed", err);
      toast.error("Could not copy the section image");
    }
  };

  const exportSection = async (slide: DeckSlide) => {
    try {
      const { buildDeckPdf } = await import("@/lib/deckPdf");
      await buildDeckPdf(
        { ...model, slides: [slide] },
        { hidden: [], theme: deckTheme, density: deckDensity },
      );
      toast.success("Section PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export the section");
    }
  };

  const exportExcel = async () => {
    setBusy("excel");
    try {
      const { exportDeckExcel } = await import("@/lib/deckExcel");
      await exportDeckExcel(model, { hidden });
      toast.success("Workbook downloaded");
    } catch (err) {
      console.error("Excel export failed", err);
      toast.error(err instanceof Error ? err.message : "Could not build the workbook");
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy("pdf");
    try {
      const { buildDeckPdf } = await import("@/lib/deckPdf");
      await buildDeckPdf(model, { hidden, theme: deckTheme, density: deckDensity });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the PDF");
    } finally {
      setBusy(null);
    }
  };

  const openGenerate = (format: "pptx" | "pdf") => {
    const params = new URLSearchParams();
    if (hidden.length) params.set("hidden", hidden.join(","));
    if (period === "calendar") params.set("period", "calendar");
    if (blockFilter.length === 1) params.set("block", blockFilter[0]);
    if (typeFilter.length === 1) params.set("type", typeFilter[0]);
    params.set("format", format);
    navigate(`/generate-ppt?${params.toString()}`);
  };

  const loading = data === undefined;
  const activeFilterCount =
    blockFilter.length + typeFilter.length + eligibilityFilter.length + (period === "calendar" ? 1 : 0);
  const checks = model.checks;
  const orgFooter = model.meta.orgName;

  return (
    <AppShell
      title="NQAS Summary Report"
      subtitle={`${model.meta.totalFacilities} facilities · Data as of ${model.meta.dataAsOf}`}
      actions={
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={busy !== null || loading}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void exportExcel()}>
                <FileSpreadsheet className="size-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportPdf()}>
                <FileDown className="size-4" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="size-4" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex overflow-hidden rounded-md">
            <Button className="gap-2 rounded-r-none" onClick={() => openGenerate("pptx")} disabled={loading}>
              <Presentation className="size-4" /> Generate deck
            </Button>
            <Button
              className="rounded-l-none border-l border-white/20 px-2"
              onClick={() => openGenerate("pdf")}
              disabled={loading}
              aria-label="Generate a PDF deck"
            >
              <FileDown className="size-4" />
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="min-w-0" data-print-report>
          {/* Print-only cover: A4 pages start with the report identity, not a
              web header, and the KPI strip is a table because the screen tiles
              are <button> elements (hidden by the global print stylesheet). */}
          <style>{`@media print { @page { size: A4 portrait; margin: 12mm 11mm 14mm; } }`}</style>
          <div className="hidden print:block mb-4 border-b-2 border-black pb-2">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase">
              {model.meta.orgName}
            </p>
            <h1 className="mt-1 text-xl font-bold leading-tight">{model.meta.deckTitle}</h1>
            <p className="mt-1 text-[11px]">
              {model.meta.district} · {filtersLabel} · {model.meta.periodLabel} ·{" "}
              {model.meta.totalFacilities} facilities
            </p>
            <p className="mt-0.5 text-[10px]">
              Data as of {model.meta.dataAsOf} · Report ID {model.meta.reportId}
            </p>
          </div>
          <table className="mb-4 hidden w-full border-collapse text-[10px] print:table">
            <thead>
              <tr>
                <th className="border border-black bg-neutral-200 px-1.5 py-1 text-left">Measure</th>
                <th className="border border-black bg-neutral-200 px-1.5 py-1 text-right">Value</th>
                <th className="border border-black bg-neutral-200 px-1.5 py-1 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Facilities", String(model.data.totalFacilities), `${model.data.blocksCount} blocks`],
                ["Hold a certificate", String(model.meta.holdCertificate), `${model.data.certifiedPct}% of facilities`],
                ["Quality Certified", String(model.data.qualityCount), ""],
                ["With conditionality", String(model.data.condCount), ""],
                ["Certificates expired", String(model.data.certExpired), `${model.data.certExpiring12m} expire within 12 months`],
                ["Not certified", String(model.data.notCertifiedCount), "in pipeline or blocked"],
              ].map(([label, value, note]) => (
                <tr key={label}>
                  <td className="border border-black px-1.5 py-1">{label}</td>
                  <td className="border border-black px-1.5 py-1 text-right tabular-nums">{value}</td>
                  <td className="border border-black px-1.5 py-1">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mb-4 hidden text-[10px] leading-relaxed print:block">
            {model.meta.holdCertificate} hold a certificate; {model.meta.certifiedStage} are in the
            Certified stage. {model.data.reconciliationLine}
          </p>

          {/* ---------- sticky, one-row filter bar ---------- */}
          <div className="sticky top-[66px] z-20 -mx-2 mb-3 border-b border-border/50 bg-background/90 px-2 py-2 backdrop-blur-md print:hidden">
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterDropdown
                label="Block"
                options={blocks.map((b) => ({ value: b, label: b }))}
                value={blockFilter}
                onChange={setBlockFilter}
                triggerWidth="w-36"
                summary={{ shown: filteredRows.length, total: deckRows.length }}
              />
              <FilterDropdown
                label="Facility type"
                options={types.map((t) => ({ value: t, label: t }))}
                value={typeFilter}
                onChange={setTypeFilter}
                triggerWidth="w-36"
                summary={{ shown: filteredRows.length, total: deckRows.length }}
              />
              <CycleFilter allowAll={false} />
              <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                Period
                <select
                  className="h-8 rounded-md border border-border/60 bg-background px-1.5 text-xs text-foreground"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value === "calendar" ? "calendar" : "fy")}
                >
                  <option value="fy">FY</option>
                  <option value="calendar">Calendar</option>
                </select>
              </label>
              <FilterDropdown
                label="More filters"
                options={eligibilityOptions.map((o) => ({ value: o.value, label: o.label }))}
                value={eligibilityFilter}
                onChange={setEligibilityFilter}
                triggerWidth="w-36"
                summary={{ shown: filteredRows.length, total: deckRows.length }}
              />
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-[11px]" onClick={clearAll}>
                  <X className="size-3" /> Clear
                </Button>
              )}
              <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                {filteredRows.length} of {deckRows.length} facilities
              </span>
            </div>
            {activeFilterCount > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {blockFilter.map((v) => (
                  <button
                    key={`b-${v}`}
                    type="button"
                    className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium"
                    onClick={() => setBlockFilter((prev) => prev.filter((x) => x !== v))}
                  >
                    Block: {v} ✕
                  </button>
                ))}
                {typeFilter.map((v) => (
                  <button
                    key={`t-${v}`}
                    type="button"
                    className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium"
                    onClick={() => setTypeFilter((prev) => prev.filter((x) => x !== v))}
                  >
                    Type: {v} ✕
                  </button>
                ))}
                {eligibilityFilter.map((v) => (
                  <button
                    key={`e-${v}`}
                    type="button"
                    className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium"
                    onClick={() => setEligibilityFilter((prev) => prev.filter((x) => x !== v))}
                  >
                    Eligibility: {v} ✕
                  </button>
                ))}
                {period === "calendar" && (
                  <button
                    type="button"
                    className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium"
                    onClick={() => setPeriod("fy")}
                  >
                    Period: Calendar year ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ---------- headline strip ---------- */}
          <div className="mb-3 print:hidden">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              <KpiTile
                label="Facilities"
                value={model.data.totalFacilities}
                note={`${model.data.blocksCount} blocks`}
                href="kpi=total"
                onClick={goList}
              />
              <KpiTile
                label="Hold a certificate"
                value={model.meta.holdCertificate}
                note={`${model.data.certifiedPct}% of facilities`}
                href="kpi=certified"
                tone="teal"
                onClick={goList}
              />
              <KpiTile
                label="Quality Certified"
                value={model.data.qualityCount}
                href="cert=Quality%20Certified"
                tone="teal"
                onClick={goList}
              />
              <KpiTile
                label="With conditionality"
                value={model.data.condCount}
                href="cert=Quality%20Certified%20with%20Conditionality"
                tone="amber"
                onClick={goList}
              />
              <KpiTile
                label="Certificates expired"
                value={model.data.certExpired}
                note={`${model.data.certExpiring12m} expire within 12 months`}
                href="status=Recertification%20Due"
                tone={model.data.certExpired > 0 ? "coral" : "grey"}
                onClick={goList}
              />
              <KpiTile
                label="Not certified"
                value={model.data.notCertifiedCount}
                note="in pipeline or blocked"
                href="kpi=pipeline"
                tone="grey"
                onClick={goList}
              />
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>
                {model.meta.holdCertificate} hold a certificate; {model.meta.certifiedStage} are in
                the Certified stage. {model.data.reconciliationLine}
              </span>
              {(checks.failed > 0 || checks.totalIssues > 0) && (
                <a
                  href="#data-quality"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                    checks.failed > 0
                      ? "border-rose-300 bg-rose-50 text-rose-800"
                      : "border-amber-300 bg-amber-50 text-amber-900",
                  )}
                >
                  <ShieldAlert className="size-3" />
                  Data quality:{" "}
                  {checks.failed > 0
                    ? `${checks.failed} reconciliation ${checks.failed === 1 ? "failure" : "failures"}`
                    : `${checks.totalIssues} ${checks.totalIssues === 1 ? "issue" : "issues"}`}
                </a>
              )}
            </p>
          </div>

          <div className="grid min-w-0 gap-5 min-[1100px]:grid-cols-[190px_minmax(0,1fr)] print:block">
            {/* ---------- contents ---------- */}
            <nav aria-label="Report sections" className="hidden min-[1100px]:block print:hidden">
              <div className="sticky top-24 space-y-0.5">
                <p className="px-2 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Contents
                </p>
                {DECK_SECTIONS.map((section) => {
                  const ids = model.slides
                    .filter((s) => s.section === section.id && s.id !== "title")
                    .map((s) => s.id);
                  const sectionHidden = ids.length > 0 && ids.every((id) => hiddenSet.has(id));
                  return (
                    <a
                      key={section.id}
                      href={`#report-${section.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        sectionRefs.current[section.id]?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors",
                        activeSection === section.id
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{section.label}</span>
                      {sectionHidden && <EyeOff className="size-3 shrink-0" />}
                    </a>
                  );
                })}
                <SectionsPopover
                  sections={DECK_SECTIONS}
                  hiddenSet={hiddenSet}
                  onShow={showSection}
                  onHide={hideSection}
                />
              </div>
            </nav>

            {/* ---------- report cards ---------- */}
            <main className="min-w-0 print:block">
              <div className="mb-3 min-[1100px]:hidden">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Jump to section
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-border/60 bg-background px-2 text-xs"
                    value={activeSection}
                    onChange={(e) => {
                      const id = e.target.value as DeckSectionId;
                      sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    {DECK_SECTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {DECK_SECTIONS.map((section) => {
                const slides = visibleSlides.filter((s) => s.section === section.id);
                const allIds = model.slides
                  .filter((s) => s.section === section.id && s.id !== "title")
                  .map((s) => s.id);
                if (slides.length === 0 && allIds.length === 0) return null;
                return (
                  <section
                    key={section.id}
                    id={`report-${section.id}`}
                    data-report-section={section.id}
                    ref={(el) => {
                      sectionRefs.current[section.id] = el;
                    }}
                    className="print-section scroll-mt-32 space-y-3"
                  >
                    <div className="hidden print:block border-b border-black pb-1">
                      <h2 className="text-[12pt] font-bold uppercase tracking-wide">
                        {section.label}
                      </h2>
                    </div>
                    {slides.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 bg-card p-4 text-xs text-muted-foreground print:hidden">
                        <b>{section.label}</b> is hidden from the report and the deck exports.{" "}
                        <button
                          type="button"
                          className="text-primary underline"
                          onClick={() => showSection(section.id)}
                        >
                          Show section
                        </button>
                      </div>
                    ) : (
                      slides.map((slide) => {
                        const table = tableMode[slide.id];
                        return (
                          <article
                            key={slide.id}
                            ref={(el) => {
                              sectionRefs.current[slide.id] = el;
                            }}
                            data-report-card
                            className="min-w-0 rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:p-4 print:break-inside-avoid print:rounded-none print:border-0 print:border-b print:border-neutral-400 print:p-0 print:pb-3 print:shadow-none"
                          >
                            <div className="mb-2 flex flex-wrap items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <h2 className="text-base font-bold leading-snug">{slide.title}</h2>
                                {slide.subtitle && (
                                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                    {slide.subtitle}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 print:hidden">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-1.5 text-[11px]"
                                  onClick={() =>
                                    setTableMode((prev) => ({ ...prev, [slide.id]: !table }))
                                  }
                                  aria-pressed={!!table}
                                  data-tip={table ? "Show as chart" : "Show as table"}
                                >
                                  <Table2 className="size-3.5" />
                                  <span className="hidden sm:inline">{table ? "Chart" : "Table"}</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 px-1.5 text-[11px]"
                                  onClick={() => void copyImage(slide)}
                                  data-tip="Copy this section as an image"
                                >
                                  <Copy className="size-3.5" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8"
                                      aria-label="Section actions"
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => void exportSection(slide)}>
                                      <Download className="size-4" /> Export section (PDF)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => void copyImage(slide)}>
                                      <Copy className="size-4" /> Copy image
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => toggleSlide(slide.id)}>
                                      <EyeOff className="size-4" /> Hide from report
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {table ? <SlideTables slide={slide} /> : <DeckBlocksView slide={slide} />}

                            {slide.dataCheck && slide.dataCheck.issues > 0 && (
                              <p className="mt-2 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1 text-[11px] text-amber-950">
                                {slide.dataCheck.text}
                              </p>
                            )}
                          </article>
                        );
                      })
                    )}
                  </section>
                );
              })}

              {/* ---------- one Data quality card ---------- */}
              <section
                id="data-quality"
                className="mt-4 scroll-mt-32 print:mt-2 print:break-inside-avoid"
              >
                <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldAlert
                      className={cn(
                        "size-4",
                        checks.failed > 0
                          ? "text-rose-600"
                          : checks.totalIssues > 0
                            ? "text-amber-600"
                            : "text-emerald-600",
                      )}
                    />
                    <h2 className="text-base font-bold">Data quality</h2>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {checks.totalIssues} {checks.totalIssues === 1 ? "issue" : "issues"} ·{" "}
                      {checks.failed} reconciliation{" "}
                      {checks.failed === 1 ? "failure" : "failures"}
                    </span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {orgFooter} · Data as of {model.meta.dataAsOf}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {checks.issues
                      .filter((i) => i.count > 0)
                      .map((issue) => (
                        <div key={issue.id} className="rounded-lg border border-border/60 p-2">
                          <div className="flex items-start gap-2">
                            <span
                              className={cn(
                                "mt-1 size-2 shrink-0 rounded-full",
                                issue.tone === "coral"
                                  ? "bg-rose-500"
                                  : issue.tone === "amber"
                                    ? "bg-amber-500"
                                    : "bg-slate-400",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold">
                                {issue.count} — {issue.label}
                              </p>
                              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                                {issue.definition}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {issue.facilities.slice(0, 6).join(", ")}
                                {issue.facilities.length > 6
                                  ? `, +${issue.facilities.length - 6} more`
                                  : ""}
                              </p>
                              {issue.href && (
                                <a href={issue.href} className="mt-1 inline-block text-[11px] text-primary underline">
                                  Open list
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="mt-2 divide-y divide-border/40 border-t border-border/40 pt-1">
                    {checks.reconcile.map((r) => (
                      <p key={r.label} className="flex items-start gap-2 py-1 text-[11px]">
                        <span
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            r.ok ? "bg-emerald-500" : "bg-rose-500",
                          )}
                        />
                        <span>
                          <b>{r.ok ? "Pass" : "Fail"}</b> — {r.label}: {r.detail}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              </section>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>
                  {orgFooter} · {model.meta.deckTitle} · Data as of {model.meta.dataAsOf}
                </span>
                <span className="flex items-center gap-2">
                  {hiddenSectionCount > 0 && (
                    <span>{hiddenSectionCount} sections hidden</span>
                  )}
                  <SectionsPopover
                    sections={DECK_SECTIONS}
                    hiddenSet={hiddenSet}
                    onShow={showSection}
                    onHide={hideSection}
                    compact
                  />
                </span>
              </div>
            </main>
          </div>
          <div className="mt-6 hidden border-t border-black pt-1 text-[9px] print:block">
            {model.meta.orgName} · {model.meta.deckTitle} · Report ID {model.meta.reportId} ·{" "}
            Data as of {model.meta.dataAsOf}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SectionsPopover({
  sections,
  hiddenSet,
  onShow,
  onHide,
  compact,
}: {
  sections: { id: DeckSectionId; label: string }[];
  hiddenSet: Set<DeckSlideId>;
  onShow: (id: DeckSectionId) => void;
  onHide: (id: DeckSectionId) => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={compact ? "ghost" : "outline"}
          size="sm"
          className="mt-1 h-7 w-full gap-1 px-2 text-[10px]"
        >
          <Eye className="size-3" /> Sections
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} className="w-56">
        <DropdownMenuLabel>Report sections</DropdownMenuLabel>
        {sections.map((section) => (
          <DropdownMenuItem
            key={section.id}
            onSelect={(e) => {
              e.preventDefault();
              // A section is hidden when every slide in it is hidden; the
              // caller resolves the actual slide ids.
              onHide(section.id);
            }}
          >
            <EyeOff className="size-4" /> Hide {section.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {sections.map((section) => (
          <DropdownMenuItem key={`show-${section.id}`} onSelect={() => onShow(section.id)}>
            <Eye className="size-4" /> Show {section.label}
          </DropdownMenuItem>
        ))}
        {hiddenSet.size > 0 && (
          <p className="px-2 py-1 text-[10px] text-muted-foreground">
            {hiddenSet.size} slides hidden from the deck and report
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
