const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-CBV6wOh8.js","assets/vendor-jspdf-BarNdCns.js","assets/vendor-motion-DgC1stbS.js","assets/icons-BxQpodNr.js","assets/vendor-charts--qXk384P.js","assets/index-CneVNiou.css","assets/deckPdf-B4kCQfkx.js","assets/DeckSlidePreview-BiCf6aLQ.js","assets/org-DjtYn14q.js","assets/AppShell-CP099uvN.js","assets/NqasLogo-CIWlMexW.js","assets/label-BaPkqXdo.js","assets/shareLink-_K-oJu5R.js","assets/today-D9v8Esj5.js","assets/fiscalYear-QbChygln.js","assets/buildingBuckets-CQds7ysI.js","assets/pdfFonts-DsWGLT77.js","assets/deckExcel-BItPXhzX.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, L as LoaderCircle, a3 as X, af as ShieldAlert, ai as EyeOff, ap as Table2, aq as Copy, ac as Ellipsis, a2 as Download, F as FileSpreadsheet, ao as FileDown, a4 as Printer, a0 as Presentation, e as Eye } from './icons-BxQpodNr.js';
import { l as useQuery, j as api, b as useNavigate, u as useAuth, B as Button, c as cn, t as toast } from './index-CBV6wOh8.js';
import { u as useCycleScope, A as AppShell, c as CycleFilter } from './AppShell-CP099uvN.js';
import { F as FilterDropdown } from './FilterDropdown-B_vJKp6C.js';
import { D as DEFAULT_SLIDE_ORDER, a as DEFAULT_HIDDEN_SLIDES, b as buildDeckModel, p as parseRateBands, c as DECK_SECTIONS, e as DeckBlocksView } from './DeckSlidePreview-BiCf6aLQ.js';
import { b as buildEligibilityOptions, m as multiFilterMatches } from './masterFilter-DrauVhuN.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, f as DropdownMenuItem, g as DropdownMenuSeparator, c as DropdownMenuLabel } from './dropdown-menu-N0nU9bdA.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
import './select-qTILnHQg.js';
import './org-DjtYn14q.js';
import './today-D9v8Esj5.js';
import './fiscalYear-QbChygln.js';
import './buildingBuckets-CQds7ysI.js';

function toDeckRow(r) {
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
    fireNocExpiry: ("fireNocExpiry" in r ? r.fireNocExpiry : void 0) ?? null,
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
    gcFundYear: r.gcFundYear
  };
}
const PREFS_VERSION = "v2";
const storageKey = (userKey) => `nqas.deck.prefs.${PREFS_VERSION}.${userKey}`;
function urlList(key) {
  if (typeof window === "undefined") return [];
  const value = new URLSearchParams(window.location.search).get(key);
  return value ? value.split(",").filter(Boolean) : [];
}
function readPrefs(userKey) {
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writePrefs(userKey, patch) {
  try {
    const current = readPrefs(userKey);
    localStorage.setItem(storageKey(userKey), JSON.stringify({ ...current, ...patch }));
  } catch {
  }
}
function blockTable(block) {
  switch (block.kind) {
    case "kpis":
      return {
        head: ["Measure", "Value", "Note"],
        rows: block.items.map((i) => [i.label, i.value, i.note ?? "-"])
      };
    case "bars":
      return {
        head: [block.title ?? "Category", "Count"],
        rows: block.items.map((i) => [i.label, i.display ?? String(i.value)]),
        note: block.note
      };
    case "stacked": {
      const total = block.segments.reduce((a, s) => a + s.value, 0);
      return {
        head: [block.title ?? "Segment", "Facilities", "Share"],
        rows: block.segments.map((s) => [
          s.label,
          String(s.value),
          `${total > 0 ? Math.round(s.value / total * 100) : 0}%`
        ]),
        note: block.note
      };
    }
    case "table":
      return {
        head: block.head,
        rows: [...block.rows, ...block.totalRow ? [block.totalRow] : []],
        note: block.note
      };
    case "heatmap":
      return {
        head: [block.totalLabel, ...block.monthLabels, "Total"],
        rows: [
          ...block.rows.map((r) => [r.label, ...r.cells.map(String), String(r.total)]),
          [block.totalLabel, ...block.totalCells.map(String), String(block.grandTotal)]
        ]
      };
    case "donut": {
      const total = block.segments.reduce((a, s) => a + s.value, 0);
      return {
        head: [block.title ?? "Status", "Facilities", "Share"],
        rows: block.segments.map((s) => [
          s.label,
          String(s.value),
          `${total > 0 ? Math.round(s.value / total * 100) : 0}%`
        ]),
        note: block.caption
      };
    }
    case "cards":
      return {
        head: ["Measure", "Value", "Detail"],
        rows: block.items.map((i) => [i.title, i.big, [i.line, i.body].filter(Boolean).join(" — ")])
      };
    case "facts":
      return { head: ["Value", "Detail"], rows: block.items.map((i) => [i.big, i.text]) };
    case "takeaways":
      return {
        head: ["#", "Action", "Facilities"],
        rows: block.items.map((i) => [String(i.n), i.title, i.body])
      };
    case "defs":
      return { head: ["Term", "Definition"], rows: block.items.map((i) => [i.term, i.definition]) };
    case "text":
      return { head: ["Note"], rows: [[block.body]] };
    case "bullets":
      return { head: [block.title ?? "Items"], rows: block.items.map((i) => [i]) };
  }
}
function SlideTables({ slide }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: slide.columns.flat().map((block, i) => {
    const table = blockTable(block);
    if (!table) return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto rounded-lg border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[420px] text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "bg-muted/40", children: table.head.map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-1.5 text-left font-semibold", children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: table.rows.map((row, ri) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: ri % 2 ? "bg-muted/20" : void 0, children: row.map((cell, ci) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "td",
          {
            className: cn(
              "px-2 py-1.5 align-top",
              ci > 0 && "text-right tabular-nums"
            ),
            children: cell === "" ? "-" : cell
          },
          ci
        )) }, ri)) })
      ] }) }),
      table.note && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: table.note })
    ] }, i);
  }) });
}
function KpiTile({
  label,
  value,
  note,
  href,
  tone,
  onClick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: () => onClick(href),
      className: "glass min-w-0 rounded-xl border border-border/60 p-3 text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: cn(
              "mt-1 block text-2xl font-bold tabular-nums",
              tone === "teal" && "text-teal-800",
              tone === "amber" && "text-amber-700",
              tone === "coral" && "text-rose-700",
              tone === "grey" && "text-slate-700"
            ),
            children: value
          }
        ),
        note && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 block text-[11px] text-muted-foreground", children: note })
      ]
    }
  );
}
function NqasSummaryReportPage() {
  const data = useQuery(api.modules.getReportData, {});
  const adminSettings = useQuery(api.facilities.getAppSettings, {});
  const navigate = useNavigate();
  const { user } = useAuth();
  const userKey = String(user?.email ?? "anonymous");
  const initialPrefs = reactExports.useMemo(() => readPrefs(userKey), [userKey]);
  const deckTheme = initialPrefs.theme === "dark-cover" || initialPrefs.theme === "high-contrast" ? initialPrefs.theme : "light";
  const deckDensity = initialPrefs.density === "compact" ? "compact" : "comfortable";
  const [blockFilter, setBlockFilter] = reactExports.useState(() => urlList("block"));
  const [typeFilter, setTypeFilter] = reactExports.useState(() => urlList("type"));
  const [eligibilityFilter, setEligibilityFilter] = reactExports.useState(() => urlList("elig"));
  const initialUrl = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const [period, setPeriod] = reactExports.useState(
    initialUrl.get("period") === "calendar" ? "calendar" : initialPrefs.period ?? "fy"
  );
  const [hidden, setHidden] = reactExports.useState(() => {
    const ids = urlList("hidden").filter(
      (id) => DEFAULT_SLIDE_ORDER.includes(id)
    );
    return ids.length ? ids : initialPrefs.hidden ?? [...DEFAULT_HIDDEN_SLIDES];
  });
  const [tableMode, setTableMode] = reactExports.useState({});
  const [busy, setBusy] = reactExports.useState(null);
  const [activeSection, setActiveSection] = reactExports.useState("summary");
  const sectionRefs = reactExports.useRef({});
  const cycleScope = useCycleScope();
  const allRows = reactExports.useMemo(() => data?.rows ?? [], [data]);
  const deckRows = reactExports.useMemo(() => allRows.map(toDeckRow), [allRows]);
  const blocks = reactExports.useMemo(() => [...new Set(deckRows.map((r) => r.block))].sort(), [deckRows]);
  const types = reactExports.useMemo(() => [...new Set(deckRows.map((r) => r.type))].sort(), [deckRows]);
  const eligibilityOptions = buildEligibilityOptions(
    adminSettings?.settings.eligibilityOptions
  );
  const filteredRows = reactExports.useMemo(
    () => allRows.filter((r) => {
      if (!multiFilterMatches(r.block, blockFilter)) return false;
      if (!multiFilterMatches(r.type, typeFilter)) return false;
      if (typeof cycleScope === "number" && r.cycle !== cycleScope) return false;
      if (!multiFilterMatches(r.eligibility ?? "", eligibilityFilter)) return false;
      return true;
    }).map(toDeckRow),
    [allRows, blockFilter, typeFilter, cycleScope, eligibilityFilter]
  );
  const filtersLabel = [
    blockFilter.length ? blockFilter.join(", ") : "All blocks",
    typeFilter.length ? typeFilter.join(", ") : "All facility types",
    typeof cycleScope === "number" ? `Cycle #${cycleScope}` : "Current cycle"
  ].join(" · ");
  const model = reactExports.useMemo(
    () => buildDeckModel(filteredRows, {
      period,
      filtersLabel,
      rateBands: parseRateBands(
        adminSettings?.settings?.rateBands
      )
    }),
    [filteredRows, period, filtersLabel, adminSettings]
  );
  reactExports.useEffect(() => {
    writePrefs(userKey, { hidden, period });
  }, [hidden, period, userKey]);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const write = (key, values) => {
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
  reactExports.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute("data-report-section");
        if (id) setActiveSection(id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.1, 0.3] }
    );
    for (const el of Object.values(sectionRefs.current)) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [data, hidden]);
  const hiddenSet = new Set(hidden);
  const visibleSlides = model.slides.filter((s) => s.id !== "title" && !hiddenSet.has(s.id));
  const hiddenSectionCount = DECK_SECTIONS.filter((section) => {
    const ids = model.slides.filter((s) => s.section === section.id && s.id !== "title").map((s) => s.id);
    return ids.length > 0 && ids.every((id) => hiddenSet.has(id));
  }).length;
  const toggleSlide = (id) => {
    setHidden((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const showSection = (section) => {
    const ids = model.slides.filter((s) => s.section === section).map((s) => s.id);
    setHidden((prev) => prev.filter((id) => !ids.includes(id)));
  };
  const hideSection = (section) => {
    const ids = model.slides.filter((s) => s.section === section).map((s) => s.id);
    setHidden((prev) => [.../* @__PURE__ */ new Set([...prev, ...ids])]);
  };
  const clearAll = () => {
    setBlockFilter([]);
    setTypeFilter([]);
    setEligibilityFilter([]);
  };
  const goList = (query) => {
    navigate(`/facilities?${query}`);
  };
  const copyImage = async (slide) => {
    const el = sectionRefs.current[slide.id];
    if (!el) return;
    try {
      const { snapdom } = await __vitePreload(async () => { const { snapdom } = await import('./index-CBV6wOh8.js').then(n => n.x);return { snapdom }},true              ?__vite__mapDeps([0,1,2,3,4,5]):void 0);
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
  const exportSection = async (slide) => {
    try {
      const { buildDeckPdf } = await __vitePreload(async () => { const { buildDeckPdf } = await import('./deckPdf-B4kCQfkx.js');return { buildDeckPdf }},true              ?__vite__mapDeps([6,1,7,2,3,0,4,5,8,9,10,11,12,13,14,15,16]):void 0);
      await buildDeckPdf(
        { ...model, slides: [slide] },
        { hidden: [], theme: deckTheme, density: deckDensity }
      );
      toast.success("Section PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export the section");
    }
  };
  const exportExcel = async () => {
    setBusy("excel");
    try {
      const { exportDeckExcel } = await __vitePreload(async () => { const { exportDeckExcel } = await import('./deckExcel-BItPXhzX.js');return { exportDeckExcel }},true              ?__vite__mapDeps([17,1,7,2,3,0,4,5,8,9,10,11,12,13,14,15]):void 0);
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
      const { buildDeckPdf } = await __vitePreload(async () => { const { buildDeckPdf } = await import('./deckPdf-B4kCQfkx.js');return { buildDeckPdf }},true              ?__vite__mapDeps([6,1,7,2,3,0,4,5,8,9,10,11,12,13,14,15,16]):void 0);
      await buildDeckPdf(model, { hidden, theme: deckTheme, density: deckDensity });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the PDF");
    } finally {
      setBusy(null);
    }
  };
  const openGenerate = (format) => {
    const params = new URLSearchParams();
    if (hidden.length) params.set("hidden", hidden.join(","));
    if (period === "calendar") params.set("period", "calendar");
    if (blockFilter.length === 1) params.set("block", blockFilter[0]);
    if (typeFilter.length === 1) params.set("type", typeFilter[0]);
    params.set("format", format);
    navigate(`/generate-ppt?${params.toString()}`);
  };
  const loading = data === void 0;
  const activeFilterCount = blockFilter.length + typeFilter.length + eligibilityFilter.length + (period === "calendar" ? 1 : 0);
  const checks = model.checks;
  const orgFooter = model.meta.orgName;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AppShell,
    {
      title: "NQAS Summary Report",
      subtitle: `${model.meta.totalFacilities} facilities · Data as of ${model.meta.dataAsOf}`,
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 print:hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "gap-2", disabled: busy !== null || loading, children: [
            busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4" }),
            "Export"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void exportExcel(), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-4" }),
              " Excel (.xlsx)"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void exportPdf(), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { className: "size-4" }),
              " PDF"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => window.print(), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "size-4" }),
              " Print"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex overflow-hidden rounded-md", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { className: "gap-2 rounded-r-none", onClick: () => openGenerate("pptx"), disabled: loading, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Presentation, { className: "size-4" }),
            " Generate deck"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              className: "rounded-l-none border-l border-white/20 px-2",
              onClick: () => openGenerate("pdf"),
              disabled: loading,
              "aria-label": "Generate a PDF deck",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { className: "size-4" })
            }
          )
        ] })
      ] }),
      children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-24", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-6 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", "data-print-report": true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `@media print { @page { size: A4 portrait; margin: 12mm 11mm 14mm; } }` }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden print:block mb-4 border-b-2 border-black pb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-semibold tracking-[0.14em] uppercase", children: model.meta.orgName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-1 text-xl font-bold leading-tight", children: model.meta.deckTitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px]", children: [
            model.meta.district,
            " · ",
            filtersLabel,
            " · ",
            model.meta.periodLabel,
            " ·",
            " ",
            model.meta.totalFacilities,
            " facilities"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-[10px]", children: [
            "Data as of ",
            model.meta.dataAsOf,
            " · Report ID ",
            model.meta.reportId
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "mb-4 hidden w-full border-collapse text-[10px] print:table", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "border border-black bg-neutral-200 px-1.5 py-1 text-left", children: "Measure" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "border border-black bg-neutral-200 px-1.5 py-1 text-right", children: "Value" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "border border-black bg-neutral-200 px-1.5 py-1 text-left", children: "Note" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: [
            ["Facilities", String(model.data.totalFacilities), `${model.data.blocksCount} blocks`],
            ["Hold a certificate", String(model.meta.holdCertificate), `${model.data.certifiedPct}% of facilities`],
            ["Quality Certified", String(model.data.qualityCount), ""],
            ["With conditionality", String(model.data.condCount), ""],
            ["Certificates expired", String(model.data.certExpired), `${model.data.certExpiring12m} expire within 12 months`],
            ["Not certified", String(model.data.notCertifiedCount), "in pipeline or blocked"]
          ].map(([label, value, note]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border border-black px-1.5 py-1", children: label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border border-black px-1.5 py-1 text-right tabular-nums", children: value }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border border-black px-1.5 py-1", children: note })
          ] }, label)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-4 hidden text-[10px] leading-relaxed print:block", children: [
          model.meta.holdCertificate,
          " hold a certificate; ",
          model.meta.certifiedStage,
          " are in the Certified stage. ",
          model.data.reconciliationLine
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sticky top-[66px] z-20 -mx-2 mb-3 border-b border-border/50 bg-background/90 px-2 py-2 backdrop-blur-md print:hidden", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              FilterDropdown,
              {
                label: "Block",
                options: blocks.map((b) => ({ value: b, label: b })),
                value: blockFilter,
                onChange: setBlockFilter,
                triggerWidth: "w-36",
                summary: { shown: filteredRows.length, total: deckRows.length }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              FilterDropdown,
              {
                label: "Facility type",
                options: types.map((t) => ({ value: t, label: t })),
                value: typeFilter,
                onChange: setTypeFilter,
                triggerWidth: "w-36",
                summary: { shown: filteredRows.length, total: deckRows.length }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CycleFilter, { allowAll: false }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1 text-[11px] text-muted-foreground", children: [
              "Period",
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: "h-8 rounded-md border border-border/60 bg-background px-1.5 text-xs text-foreground",
                  value: period,
                  onChange: (e) => setPeriod(e.target.value === "calendar" ? "calendar" : "fy"),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fy", children: "FY" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "calendar", children: "Calendar" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              FilterDropdown,
              {
                label: "More filters",
                options: eligibilityOptions.map((o) => ({ value: o.value, label: o.label })),
                value: eligibilityFilter,
                onChange: setEligibilityFilter,
                triggerWidth: "w-36",
                summary: { shown: filteredRows.length, total: deckRows.length }
              }
            ),
            activeFilterCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", className: "h-8 gap-1 px-2 text-[11px]", onClick: clearAll, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" }),
              " Clear"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto text-[11px] tabular-nums text-muted-foreground", children: [
              filteredRows.length,
              " of ",
              deckRows.length,
              " facilities"
            ] })
          ] }),
          activeFilterCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-1", children: [
            blockFilter.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                className: "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium",
                onClick: () => setBlockFilter((prev) => prev.filter((x) => x !== v)),
                children: [
                  "Block: ",
                  v,
                  " ✕"
                ]
              },
              `b-${v}`
            )),
            typeFilter.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                className: "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium",
                onClick: () => setTypeFilter((prev) => prev.filter((x) => x !== v)),
                children: [
                  "Type: ",
                  v,
                  " ✕"
                ]
              },
              `t-${v}`
            )),
            eligibilityFilter.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                className: "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium",
                onClick: () => setEligibilityFilter((prev) => prev.filter((x) => x !== v)),
                children: [
                  "Eligibility: ",
                  v,
                  " ✕"
                ]
              },
              `e-${v}`
            )),
            period === "calendar" && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium",
                onClick: () => setPeriod("fy"),
                children: "Period: Calendar year ✕"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 print:hidden", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              KpiTile,
              {
                label: "Facilities",
                value: model.data.totalFacilities,
                note: `${model.data.blocksCount} blocks`,
                href: "kpi=total",
                onClick: goList
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              KpiTile,
              {
                label: "Hold a certificate",
                value: model.meta.holdCertificate,
                note: `${model.data.certifiedPct}% of facilities`,
                href: "kpi=certified",
                tone: "teal",
                onClick: goList
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              KpiTile,
              {
                label: "Quality Certified",
                value: model.data.qualityCount,
                href: "cert=Quality%20Certified",
                tone: "teal",
                onClick: goList
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              KpiTile,
              {
                label: "With conditionality",
                value: model.data.condCount,
                href: "cert=Quality%20Certified%20with%20Conditionality",
                tone: "amber",
                onClick: goList
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              KpiTile,
              {
                label: "Certificates expired",
                value: model.data.certExpired,
                note: `${model.data.certExpiring12m} expire within 12 months`,
                href: "status=Recertification%20Due",
                tone: model.data.certExpired > 0 ? "coral" : "grey",
                onClick: goList
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              KpiTile,
              {
                label: "Not certified",
                value: model.data.notCertifiedCount,
                note: "in pipeline or blocked",
                href: "kpi=pipeline",
                tone: "grey",
                onClick: goList
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              model.meta.holdCertificate,
              " hold a certificate; ",
              model.meta.certifiedStage,
              " are in the Certified stage. ",
              model.data.reconciliationLine
            ] }),
            (checks.failed > 0 || checks.totalIssues > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "a",
              {
                href: "#data-quality",
                className: cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                  checks.failed > 0 ? "border-rose-300 bg-rose-50 text-rose-800" : "border-amber-300 bg-amber-50 text-amber-900"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "size-3" }),
                  "Data quality:",
                  " ",
                  checks.failed > 0 ? `${checks.failed} reconciliation ${checks.failed === 1 ? "failure" : "failures"}` : `${checks.totalIssues} ${checks.totalIssues === 1 ? "issue" : "issues"}`
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid min-w-0 gap-5 min-[1100px]:grid-cols-[190px_minmax(0,1fr)] print:block", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { "aria-label": "Report sections", className: "hidden min-[1100px]:block print:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sticky top-24 space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Contents" }),
            DECK_SECTIONS.map((section) => {
              const ids = model.slides.filter((s) => s.section === section.id && s.id !== "title").map((s) => s.id);
              const sectionHidden = ids.length > 0 && ids.every((id) => hiddenSet.has(id));
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "a",
                {
                  href: `#report-${section.id}`,
                  onClick: (e) => {
                    e.preventDefault();
                    sectionRefs.current[section.id]?.scrollIntoView({
                      behavior: "smooth",
                      block: "start"
                    });
                  },
                  className: cn(
                    "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors",
                    activeSection === section.id ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate", children: section.label }),
                    sectionHidden && /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "size-3 shrink-0" })
                  ]
                },
                section.id
              );
            }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              SectionsPopover,
              {
                sections: DECK_SECTIONS,
                hiddenSet,
                onShow: showSection,
                onHide: hideSection
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "min-w-0 print:block", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-3 min-[1100px]:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-[11px] font-medium text-muted-foreground", children: [
              "Jump to section",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "select",
                {
                  className: "mt-1 h-9 w-full rounded-md border border-border/60 bg-background px-2 text-xs",
                  value: activeSection,
                  onChange: (e) => {
                    const id = e.target.value;
                    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
                  },
                  children: DECK_SECTIONS.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.id, children: s.label }, s.id))
                }
              )
            ] }) }),
            DECK_SECTIONS.map((section) => {
              const slides = visibleSlides.filter((s) => s.section === section.id);
              const allIds = model.slides.filter((s) => s.section === section.id && s.id !== "title").map((s) => s.id);
              if (slides.length === 0 && allIds.length === 0) return null;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "section",
                {
                  id: `report-${section.id}`,
                  "data-report-section": section.id,
                  ref: (el) => {
                    sectionRefs.current[section.id] = el;
                  },
                  className: "print-section scroll-mt-32 space-y-3",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden print:block border-b border-black pb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-[12pt] font-bold uppercase tracking-wide", children: section.label }) }),
                    slides.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-dashed border-border/60 bg-card p-4 text-xs text-muted-foreground print:hidden", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: section.label }),
                      " is hidden from the report and the deck exports.",
                      " ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          className: "text-primary underline",
                          onClick: () => showSection(section.id),
                          children: "Show section"
                        }
                      )
                    ] }) : slides.map((slide) => {
                      const table = tableMode[slide.id];
                      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "article",
                        {
                          ref: (el) => {
                            sectionRefs.current[slide.id] = el;
                          },
                          "data-report-card": true,
                          className: "min-w-0 rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:p-4 print:break-inside-avoid print:rounded-none print:border-0 print:border-b print:border-neutral-400 print:p-0 print:pb-3 print:shadow-none",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-start gap-2", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-bold leading-snug", children: slide.title }),
                                slide.subtitle && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs leading-relaxed text-muted-foreground", children: slide.subtitle })
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-0.5 print:hidden", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                  Button,
                                  {
                                    variant: "ghost",
                                    size: "sm",
                                    className: "h-8 gap-1 px-1.5 text-[11px]",
                                    onClick: () => setTableMode((prev) => ({ ...prev, [slide.id]: !table })),
                                    "aria-pressed": !!table,
                                    "data-tip": table ? "Show as chart" : "Show as table",
                                    children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(Table2, { className: "size-3.5" }),
                                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: table ? "Chart" : "Table" })
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Button,
                                  {
                                    variant: "ghost",
                                    size: "sm",
                                    className: "h-8 gap-1 px-1.5 text-[11px]",
                                    onClick: () => void copyImage(slide),
                                    "data-tip": "Copy this section as an image",
                                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-3.5" })
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    Button,
                                    {
                                      variant: "ghost",
                                      size: "icon",
                                      className: "size-8",
                                      "aria-label": "Section actions",
                                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-4" })
                                    }
                                  ) }),
                                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void exportSection(slide), children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4" }),
                                      " Export section (PDF)"
                                    ] }),
                                    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void copyImage(slide), children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-4" }),
                                      " Copy image"
                                    ] }),
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
                                    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => toggleSlide(slide.id), children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "size-4" }),
                                      " Hide from report"
                                    ] })
                                  ] })
                                ] })
                              ] })
                            ] }),
                            table ? /* @__PURE__ */ jsxRuntimeExports.jsx(SlideTables, { slide }) : /* @__PURE__ */ jsxRuntimeExports.jsx(DeckBlocksView, { slide }),
                            slide.dataCheck && slide.dataCheck.issues > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1 text-[11px] text-amber-950", children: slide.dataCheck.text })
                          ]
                        },
                        slide.id
                      );
                    })
                  ]
                },
                section.id
              );
            }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "section",
              {
                id: "data-quality",
                className: "mt-4 scroll-mt-32 print:mt-2 print:break-inside-avoid",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-3 shadow-sm sm:p-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ShieldAlert,
                      {
                        className: cn(
                          "size-4",
                          checks.failed > 0 ? "text-rose-600" : checks.totalIssues > 0 ? "text-amber-600" : "text-emerald-600"
                        )
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-bold", children: "Data quality" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground", children: [
                      checks.totalIssues,
                      " ",
                      checks.totalIssues === 1 ? "issue" : "issues",
                      " ·",
                      " ",
                      checks.failed,
                      " reconciliation",
                      " ",
                      checks.failed === 1 ? "failure" : "failures"
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto text-[11px] text-muted-foreground", children: [
                      orgFooter,
                      " · Data as of ",
                      model.meta.dataAsOf
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid gap-2 md:grid-cols-2", children: checks.issues.filter((i) => i.count > 0).map((issue) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-border/60 p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: cn(
                          "mt-1 size-2 shrink-0 rounded-full",
                          issue.tone === "coral" ? "bg-rose-500" : issue.tone === "amber" ? "bg-amber-500" : "bg-slate-400"
                        )
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs font-semibold", children: [
                        issue.count,
                        " — ",
                        issue.label
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11px] leading-relaxed text-muted-foreground", children: issue.definition }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 truncate text-[11px] text-muted-foreground", children: [
                        issue.facilities.slice(0, 6).join(", "),
                        issue.facilities.length > 6 ? `, +${issue.facilities.length - 6} more` : ""
                      ] }),
                      issue.href && /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: issue.href, className: "mt-1 inline-block text-[11px] text-primary underline", children: "Open list" })
                    ] })
                  ] }) }, issue.id)) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 divide-y divide-border/40 border-t border-border/40 pt-1", children: checks.reconcile.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-start gap-2 py-1 text-[11px]", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: cn(
                          "mt-1 size-2 shrink-0 rounded-full",
                          r.ok ? "bg-emerald-500" : "bg-rose-500"
                        )
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: r.ok ? "Pass" : "Fail" }),
                      " — ",
                      r.label,
                      ": ",
                      r.detail
                    ] })
                  ] }, r.label)) })
                ] })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                orgFooter,
                " · ",
                model.meta.deckTitle,
                " · Data as of ",
                model.meta.dataAsOf
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
                hiddenSectionCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  hiddenSectionCount,
                  " sections hidden"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SectionsPopover,
                  {
                    sections: DECK_SECTIONS,
                    hiddenSet,
                    onShow: showSection,
                    onHide: hideSection,
                    compact: true
                  }
                )
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 hidden border-t border-black pt-1 text-[9px] print:block", children: [
          model.meta.orgName,
          " · ",
          model.meta.deckTitle,
          " · Report ID ",
          model.meta.reportId,
          " ·",
          " ",
          "Data as of ",
          model.meta.dataAsOf
        ] })
      ] })
    }
  );
}
function SectionsPopover({
  sections,
  hiddenSet,
  onShow,
  onHide,
  compact
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        variant: compact ? "ghost" : "outline",
        size: "sm",
        className: "mt-1 h-7 w-full gap-1 px-2 text-[10px]",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-3" }),
          " Sections"
        ]
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: compact ? "end" : "start", className: "w-56", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Report sections" }),
      sections.map((section) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DropdownMenuItem,
        {
          onSelect: (e) => {
            e.preventDefault();
            onHide(section.id);
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "size-4" }),
            " Hide ",
            section.label
          ]
        },
        section.id
      )),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
      sections.map((section) => /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => onShow(section.id), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-4" }),
        " Show ",
        section.label
      ] }, `show-${section.id}`)),
      hiddenSet.size > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "px-2 py-1 text-[10px] text-muted-foreground", children: [
        hiddenSet.size,
        " slides hidden from the deck and report"
      ] })
    ] })
  ] });
}

export { NqasSummaryReportPage as default };
