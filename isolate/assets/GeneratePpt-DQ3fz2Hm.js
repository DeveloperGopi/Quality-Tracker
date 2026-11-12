const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/deckRender-BFi6jtgy.js","assets/vendor-jspdf-BarNdCns.js","assets/DeckSlidePreview-BiCf6aLQ.js","assets/vendor-motion-DgC1stbS.js","assets/icons-BxQpodNr.js","assets/index-CBV6wOh8.js","assets/vendor-charts--qXk384P.js","assets/index-CneVNiou.css","assets/org-DjtYn14q.js","assets/AppShell-CP099uvN.js","assets/NqasLogo-CIWlMexW.js","assets/label-BaPkqXdo.js","assets/shareLink-_K-oJu5R.js","assets/today-D9v8Esj5.js","assets/fiscalYear-QbChygln.js","assets/buildingBuckets-CQds7ysI.js","assets/deckPdf-B4kCQfkx.js","assets/pdfFonts-DsWGLT77.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, w as RotateCcw, L as LoaderCircle, aa as SlidersHorizontal, ab as Undo2, ac as Ellipsis, ad as Bookmark, e as Eye, ae as Settings2, af as ShieldAlert, ag as ChevronsRight, ah as ChevronsLeft, G as GripVertical, ai as EyeOff, aj as ChevronLeft, z as ChevronRight, ak as MessageSquareText, a6 as Sparkles, al as PanelRight, a0 as Presentation, a3 as X, am as LayoutGrid, an as Play, H as ChevronDown, ao as FileDown } from './icons-BxQpodNr.js';
import { l as useQuery, j as api, u as useAuth, t as toast, B as Button, c as cn } from './index-CBV6wOh8.js';
import { u as useCycleScope, A as AppShell, e as Popover, f as PopoverTrigger, g as PopoverContent, c as CycleFilter, I as Sheet, J as SheetTrigger, K as SheetContent, L as SheetHeader, O as SheetTitle } from './AppShell-CP099uvN.js';
import { I as Input } from './input-Cy2oZLur.js';
import { T as Textarea } from './textarea-Dm9kSFQo.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, c as DropdownMenuLabel, f as DropdownMenuItem, g as DropdownMenuSeparator } from './dropdown-menu-N0nU9bdA.js';
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from './tabs-siU4Pie8.js';
import { p as parseRateBands, b as buildDeckModel, D as DEFAULT_SLIDE_ORDER, A as ADMIN_ONLY_HIDE, S as SLIDE_TITLES, a as DEFAULT_HIDDEN_SLIDES, c as DECK_SECTIONS, d as DeckSlidePreview } from './DeckSlidePreview-BiCf6aLQ.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
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
const APPENDIX = [...DEFAULT_HIDDEN_SLIDES];
const BUILT_IN_PRESETS = {
  "Management pack · 8 slides": {
    hidden: [
      "ia",
      "byYear",
      "profile",
      "pipeline",
      "heatmap",
      "yearA",
      "yearB",
      "checks",
      "defs"
    ],
    order: [...DEFAULT_SLIDE_ORDER]
  },
  "Full deck · 10 slides": {
    hidden: [...DEFAULT_HIDDEN_SLIDES],
    order: [...DEFAULT_SLIDE_ORDER]
  },
  // In the default financial-year mode the calendar-year month tables do not
  // exist, so Everything is exactly the 10-slide deck + 5 appendix slides.
  "Everything · 15 slides": { hidden: [], order: [...DEFAULT_SLIDE_ORDER] }
};
const storageKey = (userKey) => `nqas.deck.prefs.${PREFS_VERSION}.${userKey}`;
function readUrlPrefs() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out = {};
  const hidden = params.get("hidden");
  if (hidden != null)
    out.hidden = hidden.split(",").filter((id) => DEFAULT_SLIDE_ORDER.includes(id));
  const order = params.get("order");
  if (order)
    out.order = order.split(",").filter((id) => DEFAULT_SLIDE_ORDER.includes(id));
  if (params.get("period") === "calendar") out.period = "calendar";
  return out;
}
function loadPrefs(userKey) {
  const url = readUrlPrefs();
  const fallback = {
    hidden: [...DEFAULT_HIDDEN_SLIDES],
    order: [...DEFAULT_SLIDE_ORDER],
    period: "fy",
    theme: "light",
    density: "comfortable",
    overrides: {},
    presets: {}
  };
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      hidden: url.hidden ?? parsed.hidden ?? fallback.hidden,
      order: url.order && url.order.length === DEFAULT_SLIDE_ORDER.length ? url.order : parsed.order ?? fallback.order,
      period: url.period ?? parsed.period ?? fallback.period,
      theme: parsed.theme === "dark-cover" || parsed.theme === "high-contrast" ? parsed.theme : "light",
      density: parsed.density === "compact" ? "compact" : "comfortable",
      overrides: parsed.overrides ?? {},
      presets: parsed.presets ?? {}
    };
  } catch {
    return { ...fallback, ...url };
  }
}
function GeneratePptPage() {
  const cycleScope = useCycleScope();
  const data = useQuery(
    api.modules.getReportData,
    typeof cycleScope === "number" ? { cycle: cycleScope } : {}
  );
  const adminSettings = useQuery(api.facilities.getAppSettings, {});
  const rateBands = reactExports.useMemo(
    () => parseRateBands(
      adminSettings?.settings?.rateBands
    ),
    [adminSettings]
  );
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.appRole === "admin";
  const userKey = String(user?.email ?? "anonymous");
  const [prefs, setPrefs] = reactExports.useState(() => loadPrefs(userKey));
  const { hidden, order, period, theme, density, overrides, presets } = prefs;
  const [history, setHistory] = reactExports.useState([]);
  const [selected, setSelected] = reactExports.useState("title");
  const [dragId, setDragId] = reactExports.useState(null);
  const [present, setPresent] = reactExports.useState(null);
  const [sorterOpen, setSorterOpen] = reactExports.useState(false);
  const [settingsOpen, setSettingsOpen] = reactExports.useState(false);
  const [showNotes, setShowNotes] = reactExports.useState(true);
  const [zoom, setZoom] = reactExports.useState("fit");
  const [closedSections, setClosedSections] = reactExports.useState(/* @__PURE__ */ new Set());
  const [settingsTab, setSettingsTab] = reactExports.useState("content");
  const [sorterSelection, setSorterSelection] = reactExports.useState(/* @__PURE__ */ new Set());
  const [job, setJob] = reactExports.useState(null);
  const cancelRef = reactExports.useRef(false);
  const railRef = reactExports.useRef(null);
  const [blockFilter, setBlockFilter] = reactExports.useState(
    () => new URLSearchParams(window.location.search).get("block") ?? "all"
  );
  const [typeFilter, setTypeFilter] = reactExports.useState(
    () => new URLSearchParams(window.location.search).get("type") ?? "all"
  );
  const [language, setLanguage] = reactExports.useState("en");
  const [scopeOpen, setScopeOpen] = reactExports.useState(false);
  const allRows = reactExports.useMemo(() => data?.rows ?? [], [data]);
  const deckRows = reactExports.useMemo(() => allRows.map(toDeckRow), [allRows]);
  const blocks = reactExports.useMemo(() => [...new Set(deckRows.map((r) => r.block))].sort(), [deckRows]);
  const types = reactExports.useMemo(() => [...new Set(deckRows.map((r) => r.type))].sort(), [deckRows]);
  reactExports.useEffect(() => {
    if (blocks.length === 0) return;
    if (blockFilter !== "all" && !blocks.includes(blockFilter)) setBlockFilter("all");
    if (typeFilter !== "all" && !types.includes(typeFilter)) setTypeFilter("all");
  }, [blocks, types, blockFilter, typeFilter]);
  const filteredRows = reactExports.useMemo(
    () => deckRows.filter(
      (r) => (blockFilter === "all" || r.block === blockFilter) && (typeFilter === "all" || r.type === typeFilter)
    ),
    [deckRows, blockFilter, typeFilter]
  );
  const filtersLabel = [
    blockFilter === "all" ? "All blocks" : blockFilter,
    typeFilter === "all" ? "All facility types" : typeFilter,
    typeof cycleScope === "number" ? `Cycle #${cycleScope}` : "Current cycle"
  ].join(" · ");
  const model = reactExports.useMemo(
    () => buildDeckModel(filteredRows, { period, filtersLabel, rateBands }),
    [filteredRows, period, filtersLabel, rateBands]
  );
  const orderedSlides = reactExports.useMemo(() => {
    const byId = new Map(model.slides.map((s) => [s.id, s]));
    const out = order.map((id) => byId.get(id)).filter((s) => !!s);
    for (const slide of model.slides) if (!out.includes(slide)) out.push(slide);
    return out;
  }, [model.slides, order]);
  const displayedSlides = reactExports.useMemo(
    () => orderedSlides.map((slide) => {
      const edit = overrides[slide.id];
      if (!edit) return slide;
      return {
        ...slide,
        title: edit.title?.trim() || slide.title,
        subtitle: edit.subtitle?.trim() || slide.subtitle,
        speakerNotes: edit.notes?.trim() || slide.speakerNotes
      };
    }),
    [orderedSlides, overrides]
  );
  const hiddenSet = reactExports.useMemo(() => new Set(hidden), [hidden]);
  const visible = reactExports.useMemo(
    () => displayedSlides.filter((s) => !hiddenSet.has(s.id)),
    [displayedSlides, hiddenSet]
  );
  const pageOf = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    let page = 0;
    for (const s of displayedSlides) {
      if (!hiddenSet.has(s.id)) {
        page += 1;
        map.set(s.id, page);
      }
    }
    return map;
  }, [displayedSlides, hiddenSet]);
  const selectedSlide = displayedSlides.find((s) => s.id === selected) ?? displayedSlides[0];
  const exportModel = reactExports.useMemo(
    () => ({ ...model, slides: displayedSlides }),
    [model, displayedSlides]
  );
  reactExports.useEffect(() => {
    try {
      localStorage.setItem(storageKey(userKey), JSON.stringify(prefs));
    } catch {
    }
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (hidden.length) params.set("hidden", hidden.join(","));
    else params.delete("hidden");
    if (order.join(",") !== DEFAULT_SLIDE_ORDER.join(",")) params.set("order", order.join(","));
    else params.delete("order");
    if (period === "calendar") params.set("period", "calendar");
    else params.delete("period");
    if (blockFilter !== "all") params.set("block", blockFilter);
    else params.delete("block");
    if (typeFilter !== "all") params.set("type", typeFilter);
    else params.delete("type");
    params.delete("format");
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [prefs, userKey, hidden, order, period, blockFilter, typeFilter]);
  const commitHidden = reactExports.useCallback(
    (next) => {
      setHistory((h) => [...h.slice(-9), hidden]);
      setPrefs((p) => ({ ...p, hidden: [...new Set(next)] }));
    },
    [hidden]
  );
  const toggleHidden = reactExports.useCallback(
    (id) => {
      if (ADMIN_ONLY_HIDE.has(id) && !isAdmin) {
        toast.error("Only a State Admin can hide the cover or the definitions slide.");
        return;
      }
      const next = hiddenSet.has(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
      commitHidden(next);
      toast.success(
        hiddenSet.has(id) ? `${SLIDE_TITLES[id]} shown again` : `${SLIDE_TITLES[id]} hidden from exports`
      );
    },
    [hidden, hiddenSet, commitHidden, isAdmin]
  );
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setPrefs((p) => ({ ...p, hidden: prev }));
    setHistory((h) => h.slice(0, -1));
    toast.success("Last visibility change undone");
  };
  const hideSection = (sectionId) => {
    const ids = displayedSlides.filter((s) => s.section === sectionId).map((s) => s.id).filter((id) => !(ADMIN_ONLY_HIDE.has(id) && !isAdmin));
    commitHidden([...hidden, ...ids]);
  };
  const showSection = (sectionId) => {
    const ids = new Set(displayedSlides.filter((s) => s.section === sectionId).map((s) => s.id));
    commitHidden(hidden.filter((id) => !ids.has(id)));
  };
  const applyPreset = (name) => {
    const preset = presets[name] ?? BUILT_IN_PRESETS[name];
    if (!preset) return;
    setPrefs((p) => ({ ...p, hidden: preset.hidden, order: preset.order }));
    toast.success(`Preset “${name}” applied`);
  };
  const savePreset = () => {
    if (typeof window === "undefined") return;
    const name = window.prompt("Name this preset")?.trim();
    if (!name) return;
    setPrefs((p) => ({
      ...p,
      presets: { ...p.presets, [name]: { hidden, order } }
    }));
    toast.success(`Preset “${name}” saved on this device`);
  };
  const move = (from, to) => {
    if (from === to) return;
    setPrefs((p) => {
      const next = [...p.order];
      const fromIdx = next.indexOf(from);
      const toIdx = next.indexOf(to);
      if (fromIdx < 0 || toIdx < 0) return p;
      next.splice(toIdx, 0, ...next.splice(fromIdx, 1));
      return { ...p, order: next };
    });
  };
  const updateOverride = (id, patch) => {
    setPrefs((p) => ({
      ...p,
      overrides: {
        ...p.overrides,
        [id]: { ...p.overrides[id], ...patch }
      }
    }));
  };
  const resetOverride = (id) => {
    setPrefs((p) => {
      const next = { ...p.overrides };
      delete next[id];
      return { ...p, overrides: next };
    });
    toast.success("Slide reset to automatic content");
  };
  reactExports.useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
      if (e.key === "F5") {
        e.preventDefault();
        const index = Math.max(0, visible.findIndex((s) => s.id === selectedSlide?.id));
        setPresent(index);
        return;
      }
      if (typing) return;
      if (e.key.toLowerCase() !== "h" || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      if (selectedSlide) toggleHidden(selectedSlide.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSlide, toggleHidden, visible]);
  reactExports.useEffect(() => {
    if (present == null) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPresent(null);
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setPresent((i) => i == null ? 0 : Math.min(visible.length - 1, i + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setPresent((i) => i == null ? 0 : Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, visible.length]);
  const runExport = async (format) => {
    if (visible.length === 0) {
      toast.error("Every slide is hidden — show at least one before exporting.");
      return;
    }
    if (filteredRows.length === 0) {
      toast.error("No facility matches this scope — nothing to export.");
      return;
    }
    cancelRef.current = false;
    setJob({ format, done: 0, total: visible.length });
    try {
      const onSlide = () => {
        if (cancelRef.current) throw new Error("cancelled");
        setJob((p) => p ? { ...p, done: Math.min(p.total, p.done + 1) } : p);
      };
      if (format === "pptx") {
        const { buildDeckPptxFromModel } = await __vitePreload(async () => { const { buildDeckPptxFromModel } = await import('./deckRender-BFi6jtgy.js');return { buildDeckPptxFromModel }},true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]):void 0);
        await buildDeckPptxFromModel(exportModel, void 0, {
          hidden,
          theme,
          density,
          onSlide
        });
        toast.success(`${visible.length} slides downloaded as an editable PowerPoint`);
      } else {
        const { buildDeckPdf } = await __vitePreload(async () => { const { buildDeckPdf } = await import('./deckPdf-B4kCQfkx.js');return { buildDeckPdf }},true              ?__vite__mapDeps([16,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,17]):void 0);
        await buildDeckPdf(exportModel, { hidden, theme, density, onSlide });
        toast.success(`${visible.length} pages downloaded as PDF`);
      }
    } catch (err) {
      if (cancelRef.current) toast.message("Export cancelled");
      else {
        console.error("Deck export failed", err);
        toast.error(err instanceof Error ? err.message : "Could not build the deck");
      }
    } finally {
      setJob(null);
    }
  };
  const step = (delta) => {
    if (visible.length === 0) return;
    const index = visible.findIndex((s) => s.id === selectedSlide?.id);
    const next = visible[(index + delta + visible.length) % visible.length];
    if (next) setSelected(next.id);
  };
  const onRailKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
    } else if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (selectedSlide) toggleHidden(selectedSlide.id);
    }
  };
  const loading = data === void 0;
  const hiddenCount = displayedSlides.length - visible.length;
  const checks = model.checks;
  const failures = checks.reconcile.filter((r) => !r.ok);
  const exportDisabledReason = visible.length === 0 ? "All slides are hidden" : filteredRows.length === 0 ? "No facility matches this scope" : job ? "An export is running" : null;
  const settingsPanel = selectedSlide ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: settingsTab, onValueChange: setSettingsTab, className: "w-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "grid w-full grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "content", children: "Content" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "design", children: "Design" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "notes", children: "Notes" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "content", className: "mt-3 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-[11px] font-semibold text-muted-foreground", htmlFor: "slide-title", children: "Slide title" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            id: "slide-title",
            className: "mt-1 h-9 text-sm",
            value: overrides[selectedSlide.id]?.title ?? selectedSlide.title,
            onChange: (e) => updateOverride(selectedSlide.id, { title: e.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-[11px] font-semibold text-muted-foreground", htmlFor: "slide-subtitle", children: "Subtitle" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Textarea,
          {
            id: "slide-subtitle",
            className: "mt-1 min-h-16 text-sm",
            value: overrides[selectedSlide.id]?.subtitle ?? selectedSlide.subtitle ?? "",
            onChange: (e) => updateOverride(selectedSlide.id, { subtitle: e.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold text-muted-foreground", children: "Data-driven numbers" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap gap-1", children: [
          [...new Set(`${selectedSlide.title} ${selectedSlide.subtitle ?? ""}`.match(/\d[\d,.]*%?/g) ?? [])].slice(0, 12).map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground",
              "data-tip": "Locked: this number comes from the shared data model and cannot be edited here.",
              children: n
            },
            n
          )),
          (selectedSlide.title.match(/\d/g) ?? []).length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "No numbers on this slide." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "w-full gap-1.5 text-xs",
          onClick: () => resetOverride(selectedSlide.id),
          disabled: !overrides[selectedSlide.id],
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3.5" }),
            " Reset to automatic"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "design", className: "mt-3 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-[11px] font-semibold text-muted-foreground", children: [
        "Theme",
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm",
            value: theme,
            onChange: (e) => setPrefs((p) => ({
              ...p,
              theme: e.target.value === "dark-cover" || e.target.value === "high-contrast" ? e.target.value : "light"
            })),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "light", children: "Light — white slides, teal title bar" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "dark-cover", children: "Dark cover — cover and closing only" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "high-contrast", children: "High contrast — AA black and white" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-[11px] font-semibold text-muted-foreground", children: [
        "Density",
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm",
            value: density,
            onChange: (e) => setPrefs((p) => ({
              ...p,
              density: e.target.value === "compact" ? "compact" : "comfortable"
            })),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "comfortable", children: "Comfortable" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "compact", children: "Compact — more rows per slide" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-md border border-border/60 bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground", children: "Design edits are saved on this device per user. They never change facility data, the numbers or the shared report." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "notes", className: "mt-3 space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-[11px] font-semibold text-muted-foreground", htmlFor: "slide-notes", children: "Speaker notes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Textarea,
        {
          id: "slide-notes",
          className: "min-h-44 text-sm",
          value: overrides[selectedSlide.id]?.notes ?? selectedSlide.speakerNotes ?? "",
          onChange: (e) => updateOverride(selectedSlide.id, { notes: e.target.value })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] leading-relaxed text-muted-foreground", children: "Notes travel with the PPTX and are available in the web preview. Definitions live on the Definitions appendix slide, not in a footnote." })
    ] })
  ] }) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AppShell,
    {
      title: "Generate PPT",
      subtitle: `${filteredRows.length} facilities in scope · preview, PPTX and PDF read one slide model`,
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            className: "gap-2",
            onClick: () => {
              const index = Math.max(0, visible.findIndex((s) => s.id === selectedSlide?.id));
              setPresent(index);
            },
            disabled: visible.length === 0,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "size-4" }),
              " Present"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "gap-2", onClick: () => setSorterOpen(true), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutGrid, { className: "size-4" }),
          " Slide sorter"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex overflow-hidden rounded-md", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              className: "gap-2 rounded-r-none",
              onClick: () => void runExport("pptx"),
              disabled: !!exportDisabledReason,
              "data-tip": exportDisabledReason ?? "Download an editable PowerPoint",
              children: [
                job?.format === "pptx" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Presentation, { className: "size-4" }),
                "Download PPTX"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                className: "rounded-l-none border-l border-white/20 px-2",
                "aria-label": "More download options",
                disabled: !!exportDisabledReason,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-4" })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void runExport("pptx"), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Presentation, { className: "size-4" }),
                " Download PPTX"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void runExport("pdf"), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { className: "size-4" }),
                " Download PDF"
              ] })
            ] })
          ] })
        ] })
      ] }),
      children: [
        loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-24", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-6 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass mb-3 flex flex-wrap items-center gap-2 rounded-xl px-2.5 py-2 text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open: scopeOpen, onOpenChange: setScopeOpen, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "h-8 gap-1.5 text-xs", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersHorizontal, { className: "size-3.5" }),
                blockFilter === "all" ? "All blocks" : blockFilter,
                " ·",
                " ",
                typeFilter === "all" ? "All types" : typeFilter,
                " ·",
                " ",
                period === "fy" ? "FY" : "CY"
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { align: "start", className: "w-80 space-y-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: "Scope" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-[11px] font-semibold text-muted-foreground", children: [
                  "Block",
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      className: "mt-1 h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs",
                      value: blockFilter,
                      onChange: (e) => setBlockFilter(e.target.value),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All blocks" }),
                        blocks.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: b, children: b }, b))
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-[11px] font-semibold text-muted-foreground", children: [
                  "Facility type",
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      className: "mt-1 h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs",
                      value: typeFilter,
                      onChange: (e) => setTypeFilter(e.target.value),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All types" }),
                        types.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, children: t }, t))
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "Certification cycle" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CycleFilter, { allowAll: false })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-[11px] font-semibold text-muted-foreground", children: [
                  "Period",
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      className: "mt-1 h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs",
                      value: period,
                      onChange: (e) => setPrefs((p) => ({
                        ...p,
                        period: e.target.value === "calendar" ? "calendar" : "fy"
                      })),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fy", children: "Financial year (Apr–Mar)" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "calendar", children: "Calendar year" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-[11px] font-semibold text-muted-foreground", children: [
                  "Language",
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      className: "mt-1 h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs",
                      value: language,
                      onChange: (e) => setLanguage(e.target.value === "ta" ? "ta" : "en"),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "en", children: "English" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ta", children: "Tamil" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-t border-border/60 pt-2 text-xs", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Facilities in scope" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "tabular-nums", children: filteredRows.length })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] leading-relaxed text-muted-foreground", children: "Scope is kept in the URL, so Back restores this view and a shared link opens the same deck." })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary", children: [
              filteredRows.length,
              " facilities · ",
              visible.length,
              " of ",
              displayedSlides.length,
              " slides will be exported"
            ] }),
            hiddenCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
              hiddenCount,
              " hidden"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex flex-wrap items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "ghost",
                  size: "sm",
                  className: "h-8 gap-1 text-xs",
                  onClick: () => setPrefs((p) => ({ ...p, hidden: [...APPENDIX] })),
                  children: "Hide appendix"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", className: "h-8 gap-1 text-xs", onClick: undo, disabled: !history.length, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { className: "size-3.5" }),
                " Undo"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", className: "h-8 gap-1 text-xs", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-4" }),
                  " Presets"
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-56", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Slide presets" }),
                  [...Object.keys(BUILT_IN_PRESETS), ...Object.keys(presets)].map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => applyPreset(name), children: name }, name)),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: savePreset, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Bookmark, { className: "size-4" }),
                    " Save current preset"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => commitHidden([]), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-4" }),
                    " Show all slides"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Sheet, { open: settingsOpen, onOpenChange: setSettingsOpen, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SheetTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "h-8 gap-1 text-xs xl:hidden", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Settings2, { className: "size-3.5" }),
                  " Slide settings"
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(SheetContent, { side: "bottom", className: "max-h-[85dvh] overflow-y-auto", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SheetHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SheetTitle, { children: "Slide settings" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3", children: settingsPanel })
                ] })
              ] })
            ] })
          ] }),
          language === "ta" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900", children: "Tamil facility names render with the embedded Noto Sans Tamil font in every download. Body copy stays English until the translation pack is loaded — the preview always matches the download." }),
          failures.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex flex-wrap items-start gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-950", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "mt-0.5 size-4 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("b", { children: [
                "Data check: ",
                failures.length,
                " reconciliation ",
                failures.length === 1 ? "failure" : "failures",
                "."
              ] }),
              " ",
              failures.map((f) => `${f.label} — ${f.detail}`).join(" "),
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "underline",
                  onClick: () => {
                    setSelected("checks");
                    if (hiddenSet.has("checks")) commitHidden(hidden.filter((id) => id !== "checks"));
                  },
                  children: "Open Data checks"
                }
              )
            ] })
          ] }),
          job && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 rounded-lg border border-border/60 bg-muted/30 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1.5 flex items-center gap-2 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex-1 font-medium", children: [
                "Building the ",
                job.format.toUpperCase(),
                " — slide ",
                job.done,
                " of ",
                job.total
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "text-xs text-primary underline",
                  onClick: () => {
                    cancelRef.current = true;
                  },
                  children: "Cancel"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 overflow-hidden rounded-full bg-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "h-full bg-primary transition-[width] duration-150",
                style: { width: `${job.done / Math.max(job.total, 1) * 100}%` }
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid min-w-0 gap-4 lg:grid-cols-[228px_minmax(0,1fr)] xl:grid-cols-[228px_minmax(0,1fr)_296px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto", children: [
              "                ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  ref: railRef,
                  role: "listbox",
                  tabIndex: 0,
                  "aria-label": "Slides",
                  "data-testid": "deck-filmstrip",
                  onKeyDown: onRailKey,
                  className: "flex snap-x gap-2 overflow-x-auto pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0",
                  children: DECK_SECTIONS.map((section) => {
                    const slides = displayedSlides.filter((s) => s.section === section.id);
                    if (slides.length === 0) return null;
                    const sectionHidden = slides.every((s) => hiddenSet.has(s.id));
                    const closed = closedSections.has(section.id);
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-[240px] shrink-0 lg:w-auto", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-1 px-1 py-1", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "button",
                          {
                            type: "button",
                            className: "flex min-w-0 items-center gap-1 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase",
                            onClick: () => setClosedSections((prev) => {
                              const next = new Set(prev);
                              if (next.has(section.id)) next.delete(section.id);
                              else next.add(section.id);
                              return next;
                            }),
                            "aria-expanded": !closed,
                            children: [
                              closed ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronsRight, { className: "size-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronsLeft, { className: "size-3" }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: section.label })
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            type: "button",
                            className: "text-[10px] text-primary hover:underline",
                            onClick: () => sectionHidden ? showSection(section.id) : hideSection(section.id),
                            children: sectionHidden ? "Show" : "Hide"
                          }
                        )
                      ] }),
                      !closed && slides.map((slide) => {
                        const isHidden = hiddenSet.has(slide.id);
                        const blocked = ADMIN_ONLY_HIDE.has(slide.id) && !isAdmin;
                        const page = pageOf.get(slide.id);
                        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "div",
                          {
                            draggable: true,
                            onDragStart: (e) => {
                              setDragId(slide.id);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", slide.id);
                            },
                            onDragOver: (e) => e.preventDefault(),
                            onDrop: (e) => {
                              e.preventDefault();
                              if (dragId) move(dragId, slide.id);
                              setDragId(null);
                            },
                            onDragEnd: () => setDragId(null),
                            className: cn(
                              "group mb-1.5 flex w-full items-start gap-1 rounded-lg border p-1.5 transition-colors",
                              selected === slide.id ? "border-primary/60 bg-primary/5" : "border-transparent hover:border-border/60 hover:bg-muted/40",
                              isHidden && "opacity-55",
                              dragId === slide.id && "opacity-40"
                            ),
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: "mt-1 size-3.5 shrink-0 cursor-grab text-muted-foreground" }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => setSelected(slide.id),
                                  className: "min-w-0 flex-1 text-left",
                                  "aria-current": selected === slide.id ? "true" : void 0,
                                  children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mb-1 flex items-center gap-1", children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex h-4 min-w-4 items-center justify-center rounded bg-muted px-1 text-[9px] font-bold tabular-nums text-muted-foreground", children: page ?? "–" }),
                                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11px] font-medium", children: SLIDE_TITLES[slide.id] }),
                                      slide.dataCheck && slide.dataCheck.issues > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                                        "span",
                                        {
                                          className: "size-1.5 shrink-0 rounded-full bg-amber-500",
                                          "data-tip": slide.dataCheck.text,
                                          "aria-label": slide.dataCheck.text
                                        }
                                      ),
                                      isHidden && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-muted px-1 text-[9px] text-muted-foreground", children: "Hidden" })
                                    ] }),
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                                      DeckSlidePreview,
                                      {
                                        slide,
                                        theme,
                                        density,
                                        dataAsOf: model.meta.dataAsOf,
                                        filtersLabel,
                                        className: "pointer-events-none rounded-md border border-border/60"
                                      }
                                    )
                                  ]
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => toggleHidden(slide.id),
                                  disabled: blocked,
                                  "data-tip": blocked ? "Only a State Admin can hide this slide" : isHidden ? "Show this slide (H)" : "Hide this slide (H)",
                                  "aria-label": `${isHidden ? "Show" : "Hide"} slide ${page ?? ""}: ${SLIDE_TITLES[slide.id]}`,
                                  "aria-pressed": isHidden,
                                  className: "relative flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40",
                                  children: isHidden ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-3.5" })
                                }
                              )
                            ]
                          },
                          slide.id
                        );
                      })
                    ] }, section.id);
                  })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0", children: selectedSlide ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary", children: pageOf.has(selectedSlide.id) ? `Slide ${pageOf.get(selectedSlide.id)} of ${visible.length}` : "Hidden — not exported" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11px] text-muted-foreground", children: SLIDE_TITLES[selectedSlide.id] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex flex-wrap items-center gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mr-1 flex items-center gap-0.5 rounded-md border border-border/60 p-0.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        className: cn(
                          "rounded px-1.5 py-0.5 text-[10px]",
                          zoom === "fit" && "bg-primary text-white"
                        ),
                        onClick: () => setZoom("fit"),
                        children: "Fit"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        className: cn(
                          "rounded px-1.5 py-0.5 text-[10px]",
                          zoom === 100 && "bg-primary text-white"
                        ),
                        onClick: () => setZoom(100),
                        children: "100%"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        className: cn(
                          "rounded px-1.5 py-0.5 text-[10px]",
                          zoom === 75 && "bg-primary text-white"
                        ),
                        onClick: () => setZoom(75),
                        children: "75%"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      variant: "outline",
                      size: "sm",
                      className: "h-7 gap-1 px-2 text-[11px]",
                      disabled: visible.length === 0,
                      onClick: () => step(-1),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "size-3.5" }),
                        " Previous"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Button,
                    {
                      variant: "outline",
                      size: "sm",
                      className: "h-7 gap-1 px-2 text-[11px]",
                      disabled: visible.length === 0,
                      onClick: () => step(1),
                      children: [
                        "Next ",
                        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3.5" })
                      ]
                    }
                  )
                ] })
              ] }),
              selectedSlide.dataCheck && selectedSlide.dataCheck.issues > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-start gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-950", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "mt-0.5 size-4 shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("b", { children: [
                    selectedSlide.dataCheck.text,
                    "."
                  ] }),
                  " The stamp stays on the export even when this slide is hidden — fix the rows in Admin → Data checks."
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-auto rounded-xl bg-muted/30 p-2 sm:p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "mx-auto",
                  "data-testid": "deck-canvas",
                  style: {
                    width: zoom === "fit" ? "100%" : zoom === 100 ? 960 : 720,
                    maxWidth: "100%"
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    DeckSlidePreview,
                    {
                      slide: selectedSlide,
                      page: pageOf.get(selectedSlide.id),
                      total: visible.length,
                      dataAsOf: model.meta.dataAsOf,
                      filtersLabel,
                      theme,
                      density,
                      className: "shadow-lg"
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-xl border border-border/60", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    className: "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold",
                    onClick: () => setShowNotes((v) => !v),
                    "aria-expanded": showNotes,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquareText, { className: "size-4" }),
                      "Speaker notes",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[11px] font-normal text-muted-foreground", children: showNotes ? "Hide" : "Show" })
                    ]
                  }
                ),
                showNotes && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/60 px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "whitespace-pre-line text-xs leading-relaxed text-muted-foreground", children: selectedSlide.speakerNotes ?? "No notes for this slide." }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-3.5" }),
                "Drag a thumbnail to reorder · ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "rounded border px-1", children: "H" }),
                " hides or shows · ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "rounded border px-1", children: "F5" }),
                " presents · hidden slides are left out and page numbers renumber."
              ] })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground", children: "Every slide is hidden. Use the eye on a thumbnail to bring one back." }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "hidden min-w-0 xl:block", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sticky top-4 rounded-xl border border-border/60 bg-card p-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(PanelRight, { className: "size-4 text-muted-foreground" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold", children: "Slide settings" })
              ] }),
              settingsPanel
            ] }) })
          ] })
        ] }),
        present != null && visible[present] && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "fixed inset-0 z-[100] flex flex-col bg-black",
            "data-testid": "deck-present",
            role: "dialog",
            "aria-modal": "true",
            "aria-label": "Slide presentation",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-4 py-2 text-xs text-white/80", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Presentation, { className: "size-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: visible[present].title }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto tabular-nums", children: [
                  present + 1,
                  " / ",
                  visible.length
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    className: "rounded p-1 hover:bg-white/10",
                    onClick: () => setPresent(null),
                    "aria-label": "Exit presentation",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-5" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 items-center justify-center p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "w-full",
                  style: { maxWidth: "min(1400px, calc((100dvh - 8rem) * 16 / 9))" },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    DeckSlidePreview,
                    {
                      slide: visible[present],
                      page: present + 1,
                      total: visible.length,
                      dataAsOf: model.meta.dataAsOf,
                      filtersLabel,
                      theme,
                      density,
                      className: "w-full"
                    }
                  )
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-3 pb-3 text-[11px] text-white/60", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "← → navigate" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Esc exit" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Hidden slides are skipped" })
              ] })
            ]
          }
        ),
        sorterOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-[90] flex flex-col bg-background/95 backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutGrid, { className: "size-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold", children: "Slide sorter" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
              visible.length,
              " of ",
              displayedSlides.length,
              " will be exported"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex flex-wrap items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  className: "h-7 gap-1 text-[11px]",
                  onClick: () => setSorterSelection(new Set(displayedSlides.map((s) => s.id))),
                  children: "Select all"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  className: "h-7 gap-1 text-[11px]",
                  disabled: sorterSelection.size === 0,
                  onClick: () => {
                    commitHidden([...hidden, ...sorterSelection]);
                    setSorterSelection(/* @__PURE__ */ new Set());
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "size-3.5" }),
                    " Hide selected"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  className: "h-7 gap-1 text-[11px]",
                  disabled: sorterSelection.size === 0,
                  onClick: () => {
                    commitHidden(hidden.filter((id) => !sorterSelection.has(id)));
                    setSorterSelection(/* @__PURE__ */ new Set());
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-3.5" }),
                    " Show selected"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", className: "h-7 gap-1 text-[11px]", onClick: () => setSorterOpen(false), children: "Close" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: displayedSlides.map((slide) => {
            const isHidden = hiddenSet.has(slide.id);
            const page = pageOf.get(slide.id);
            const picked = sorterSelection.has(slide.id);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                draggable: true,
                onDragStart: (e) => {
                  setDragId(slide.id);
                  e.dataTransfer.setData("text/plain", slide.id);
                },
                onDragOver: (e) => e.preventDefault(),
                onDrop: (e) => {
                  e.preventDefault();
                  if (dragId) move(dragId, slide.id);
                  setDragId(null);
                },
                className: cn(
                  "rounded-xl border p-2",
                  picked ? "border-primary bg-primary/5" : "border-border/60",
                  isHidden && "opacity-55"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1.5 flex items-center gap-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "checkbox",
                        checked: picked,
                        onChange: (e) => setSorterSelection((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(slide.id);
                          else next.delete(slide.id);
                          return next;
                        }),
                        "aria-label": `Select ${SLIDE_TITLES[slide.id]}`
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-muted px-1 text-[10px] font-bold tabular-nums text-muted-foreground", children: page ?? "–" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11px] font-medium", children: SLIDE_TITLES[slide.id] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        className: "ml-auto rounded p-1 text-muted-foreground hover:bg-muted",
                        onClick: () => toggleHidden(slide.id),
                        "aria-label": isHidden ? "Show slide" : "Hide slide",
                        children: isHidden ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-3.5" })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "block w-full text-left", onClick: () => {
                    setSelected(slide.id);
                    setSorterOpen(false);
                  }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    DeckSlidePreview,
                    {
                      slide,
                      theme,
                      density,
                      dataAsOf: model.meta.dataAsOf,
                      filtersLabel,
                      className: "rounded-md border border-border/50"
                    }
                  ) })
                ]
              },
              slide.id
            );
          }) }) })
        ] })
      ]
    }
  );
}

export { GeneratePptPage as default };
